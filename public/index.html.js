let manager;
(function() {

    // フラグメントのファクトリ(情報量皆無なコメント)
    class MapFragmentFactory extends FragmentFactory {

        static OneTextBoxFragment = class extends AjaxFragment {
            constructor(title, description, hint, textarea) {
                super("frames/one-text-box.html");
                this._title = title;
                this._description = description;
                this._hint = hint;
                this._textarea = textarea;
            }

            async onViewCreated(view) {
                await super.onViewCreated(view);
                view.find("#title").text(this._title);
                view.find("#description").text(this._description);
                view.find("#textbox-hint").text(this._hint);
                view.find("#container").html(this._textarea ?
                    '<textarea id="textbox" class="form-control" aria-describedby="textbox-hint" style="height:50vh"></textarea>' :
                    '<input id="textbox" class="form-control" aria-describedby="textbox-hint">'
                );
                this._textbox = view.find("#textbox");
                view.find("#next").on("click", async() => {
                    this.showOverlay();
                    await this.onAccept(this._textbox.val());
                    this.hideOverlay();
                });
                this._textbox.on("keypress", e => {
                    if (!this._textarea && e.keyCode === 13) {
                        // if enter key pressed
                        view.find("#next").trigger("click");
                    }
                })
            }

            getTextBox() {
                return this._textbox;
            }

            onAccept(text) {
                console.error("onAccept Must Be Overridden");
            }
        }

        _map = {
            "404": class extends AjaxFragment {
                constructor() {
                    super("404.html");
                }
            },
            "about": class extends AjaxFragment {
                constructor() {
                    super("frames/about.html");
                }
            },
            "account": class extends AjaxFragment {
                constructor() {
                    super("frames/account.html");
                }

                loadAccountData(view) {
                    let currentUser = firebase.auth().currentUser;
                    if (currentUser) {

                        // username
                        view.find("#table-username").text(currentUser.displayName);

                        let providerTexts = {
                            "google.com": "Google",
                            "password": "Emali"
                        };

                        // providers
                        view.find("#table-providers").text(null);
                        for (let provider in currentUser.providerData) {
                            view.find("#table-providers").append('<li class="list-inline-item">' +
                                providerTexts[currentUser.providerData[provider].providerId] +
                                "</li>");
                        }

                        // emali
                        view.find("#table-email").text(currentUser.email !== null ? currentUser.email : "登録されていません");


                        // password
                        view.find("#table-password").text("****** (存在しないか、セキュリティ上の理由で表示できません)");

                        // uid
                        view.find("#table-uid").text(currentUser.uid);
                    }
                }

                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    this.loadAccountData(view);
                }
            },
            "pwc": class extends AjaxFragment {
                constructor() {
                    super("frames/send-password-email.html")
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#cancel-button").on("click", () => {
                        this.escape();
                    });
                    view.find("#submit-button").on("click", () => {
                        let address = view.find("#modal-email").val();
                        firebase.auth().sendPasswordResetEmail(address)
                            .then(() => {
                                ToastUtils.showToast(address + "にパスワード変更メールを送信しました");
                                this.escape();
                            }).catch((error) => {
                                ToastUtils.showToast("メールの送信に失敗しました");
                                console.error(error);
                            })
                    });
                    let user = firebase.auth().currentUser;
                    if (user) {
                        view.find("#modal-email").val(user.email);
                    }
                }
            },
            "logout": class extends AjaxFragment {
                constructor() {
                    super("frames/logout.html")
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#cancel-button").on("click", () => {
                        this.escape();
                    });
                    view.find("#submit-button").on("click", () => {
                        firebase.auth().signOut().then(() => {
                            ToastUtils.showToast("サインアウトしました");
                            this.escape();
                            this.replace("about");
                        }).catch((error) => {
                            ToastUtils.showToast("サインアウトに失敗しました");
                        });
                    });
                }
            },
            "login": class extends AjaxFragment {
                constructor() {
                    super("frames/login.html")
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    if (!firebaseui.auth.instancedAuth) {
                        firebaseui.auth.instancedAuth = new firebaseui.auth.AuthUI(firebase.auth());
                    }
                    firebaseui.auth.instancedAuth.start("#login-container", {
                        signInOptions: [
                            firebase.auth.EmailAuthProvider.PROVIDER_ID,
                            firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                        ],
                        signInSuccessUrl: "#about",
                    });
                }
            },
            "mc": class extends MapFragmentFactory.OneTextBoxFragment {
                    constructor() {
                        super("新しいカスタムメタを作成", "名前", "名前は2文字から40文字まで入力できます")
                    }

                    async onViewCreated(view) {
                        await super.onViewCreated(view);
                        this.getTextBox().attr("maxlength", "40");
                        if (FirestoreUtils.userDocument) {
                            let editing = await FirestoreUtils.userDocument.collection("custom-meta")
                                .where("editing", "==", true)
                                .limit(1)
                                .get();
                            if (editing.size > 0) {
                                this.getTextBox().val(editing.docs[0].get("name"));
                                ToastUtils.showToast("編集中のカスタムメタから状態を復元しました");
                            }
                        }
                    }
                    async onAccept(text) {
                        try {
                            let meta = await this.createCustomMeta(text);
                            this.replace("m-" + new State(meta.getDocId()).convertToText());
                        } catch (e) {
                            ToastUtils.showToast(e);
                            console.error(e);
                        }
                    }
                    async createCustomMeta(name) {
                        if (name.length < 2 || name.length > 40 || QueryUtils.isContainsBadChar(name)) {
                            throw '<span class="text-warning">カスタムメタの名前が不正です</span>'
                        }
                        let doc = await FirestoreUtils.userDocument.collection("custom-meta")
                            .where("name", "==", name)
                            .limit(1)
                            .get();
                        if (doc.size) {
                            let ret = new Meta(doc.docs[0].id);
                            await ret.getInitPromise();
                            return ret;
                            //return new CustomMeta.Builder(doc.docs[0].id).build();
                        } else {
                            let ret = new Meta();
                            await ret.getInitPromise();
                            await ret.setName(name);
                            return ret;
                            //return new CustomMeta.Builder().setName(name).build();
                        }
                    }
                }
                /*class extends AjaxFragment {
                               constructor() {
                                   super("frames/create-custom-meta.html")
                               }
                               async onViewCreated(view) {
                                   await super.onViewCreated(view);
                                   this.inputBox = view.find("#custom-meta-name-input");
                                   if (FirestoreUtils.userDocument) {
                                       let editing = await FirestoreUtils.userDocument.collection("custom-meta")
                                           .where("editing", "==", true)
                                           .limit(1)
                                           .get();
                                       if (editing.size > 0) {
                                           this.inputBox.val(editing.docs[0].get("name"));
                                           ToastUtils.showToast("編集中のカスタムメタから状態を復元しました");
                                       }
                                   }

                                   this.inputBox.on("keypress", e => {
                                       if (e.keyCode === 13) {
                                           // if enter key pressed
                                           view.find("#next").trigger("click");
                                       }
                                   })
                                   view.find("#next").on("click", async() => {
                                       try {
                                           let meta = await this.createCustomMeta(this.inputBox.val());
                                           this.replace("m-" + new State(meta.getDocId()).convertToText());
                                       } catch (e) {
                                           ToastUtils.showToast(e);
                                           console.error(e);
                                       }
                                   })
                               }

                               async createCustomMeta(name) {
                                   if (name.length < 2 || name.length > 40 || QueryUtils.isContainsBadChar(name)) {
                                       throw '<span class="text-warning">カスタムメタの名前が不正です</span>'
                                   }
                                   let doc = await FirestoreUtils.userDocument.collection("custom-meta")
                                       .where("name", "==", name)
                                       .limit(1)
                                       .get();
                                   if (doc.size) {
                                       let ret = new Meta(doc.docs[0].id);
                                       await ret.getInitPromise();
                                       return ret;
                                       //return new CustomMeta.Builder(doc.docs[0].id).build();
                                   } else {
                                       let ret = new Meta();
                                       await ret.getInitPromise();
                                       await ret.setName(name);
                                       return ret;
                                       //return new CustomMeta.Builder().setName(name).build();
                                   }
                               }
                           }*/
                ,
            "mt": class extends AjaxFragment {
                constructor() {
                    super("frames/select-meta-type.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#next").on("click", async() => {
                        let type = view.find('input[name="custom-meta-type-radio"]:checked').val();
                        let typeName = { "exist": 0, "enum": 1 }[type];
                        try {
                            if (typeName !== undefined) {
                                this.showOverlay();
                                await this._meta.setType(typeName);
                                this.hideOverlay();
                                this.escape();
                                // if (typeName === "exist") {
                                //     await this._meta.finishEditing();
                                //     ToastUtils.showToast("カスタムメタの作成に成功しました。");
                                //     this.escape();
                                // } else if (typeName === "enum") {
                                //     this.replace("mv-" + new State(this._meta.getDocId()).convertToText());
                                // } else {
                                //     this.replace("404");
                                //     ToastUtils.showToast("予期せぬエラーが発生しました。")
                                // }
                            } else {
                                ToastUtils.showToast("どちらかを選択してください！");
                            }
                        } catch (e) {
                            console.error(e);
                            ToastUtils.showToast(e)
                        }
                    })
                }
                onSaveState(state) {
                    state.state = this._meta.getDocId()
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument) {
                            let docId = state.state;
                            this._meta = new Meta(docId);
                            //this._meta = await new CustomMeta.Builder(docId).build();
                        }
                    } catch (e) {
                        ToastUtils.showToast("パラメータ不正！");
                        console.error(e);
                    }
                }
            },
            "mv": class extends AjaxFragment {
                constructor() {
                    super("frames/edit-enum-meta.html")
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    this._view = view;
                    view.find("#add-enum").on("click", () => {
                        this.addEnum();
                    });
                    this._table = view.find("#custom-meta-list-tbody");
                    let parentThis = this;
                    this._table.on("click", "button.enum-delete", function() {
                        let row = $(this).closest("tr");
                        row.remove();
                        parentThis._index = 0;
                        parentThis._table.children().each((index, element) => {
                            parentThis._index++;
                            element = $(element);
                            element.attr("index", index + 1);
                        });
                    });
                    view.find("#next").on("click", async() => {
                        let result = [];
                        try {
                            this._table.children().each((index, element) => {
                                let value = $(element).find("input.enum-name-form").val();
                                if (value.length < 2 || value.length > 40 || QueryUtils.isContainsBadChar(value)) {
                                    throw '<span class="text-warning">カスタムメタの名前が不正です：INDEX ' + (index + 1) + '</span>'
                                }
                                result.push(value);
                            });
                        } catch (e) {
                            ToastUtils.showToast(e);
                            console.error(e);
                            return;
                        }
                        this.showOverlay();
                        await this._meta.setValue(result);
                        this.hideOverlay();
                        this.escape();
                    });
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument) {
                            let docId = state.state;
                            this._meta = new Meta(docId);
                            //this._meta = await new CustomMeta.Builder(docId).build();
                            await this._meta.getInitPromise();
                            let value = this._meta.getValue();
                            if (value) {
                                value.forEach(name => {
                                    this.addEnum(name);
                                });
                            }
                        }
                    } catch (e) {
                        ToastUtils.showToast("パラメータ不正！");
                        console.error(e);
                    }
                }
                onSaveState(state) {
                    state.state = this._meta.getDocId();
                }
                _index = 0;
                addEnum(name = "") {
                    let row = $(
                        `<tr index="${++this._index}">
                            <td>
                                <input class="form-control enum-name-form" maxlength="40" value="${name}">
                            </td>
                            <td>
                                <button class="btn btn-sm btn-danger enum-delete">削除</button>
                            </td>
                        </tr>
                        `
                    );
                    row.appendTo(this._table);
                }
            },
            "ml": class extends AjaxFragment {
                constructor() {
                    super("frames/custom-meta.html");
                }

                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#custom-meta-search").on("input", () => {
                        if (this._inputTimer) {
                            clearTimeout(this._inputTimer);
                        }
                        this._inputTimer = setTimeout(async() => {
                            let searchText = this._searchBox.val();
                            if (!QueryUtils.isContainsBadChar(searchText)) {
                                this._searchText = searchText;
                                this.invalidateHash();
                                if (FirestoreUtils.userDocument) {
                                    let result = await this.queryCustomMetaFrom(searchText);
                                    this.setCustomMetaList(result.docs);
                                }
                            }
                        }, 1000);
                    });
                    this._searchBox = view.find("#custom-meta-search");
                    this._list = view.find("#custom-meta-list-tbody");
                    this._list.on("click", "button[custom-meta-delete]", function() {
                        let metaDoc = $(this).attr("custom-meta-delete");
                        manager.push("md-" + new State(metaDoc).convertToText());
                    });

                    this._list.on("click", "button[custom-meta-detail]", function() {
                        let metaDoc = $(this).attr("custom-meta-detail");
                        manager.push("m-" + new State(metaDoc).convertToText());
                    })
                }

                async onResume() {
                    super.onResume();
                    if (FirestoreUtils.userDocument) {
                        let result = await this.queryCustomMetaFrom(this._searchBox.val());
                        this.setCustomMetaList(result.docs);
                    }
                }

                async onChangeState(old, state) {
                    try {
                        if (state.state) {
                            this._searchBox.val(state.state);
                        }
                    } catch (e) { console.error(e); }
                }

                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._searchText;
                }

                queryCustomMetaFrom(text) {
                    let query = FirestoreUtils.userDocument.collection("custom-meta")
                        .limit(10);
                    if (text.length >= 2) {
                        query = QueryUtils.buildSearchQuery(text, "bi-gram", query);
                    }
                    return query.get();
                }

                setCustomMetaList(list) {
                    this._list.empty();
                    list.forEach((snapshot) => {
                        let data = snapshot.data();
                        this._list.append(
                            `<tr class="position-relative">
<td>
    ${data.name}
</td>
<td class="text-uppercase">
    ${Meta.TYPE_TEXT[data.type]}
</td>
<td class="text-end">
    <button class="btn btn-sm btn-primary" custom-meta-detail="${snapshot.ref.id}">詳細</button>
    <button class="btn btn-sm btn-danger" custom-meta-delete="${snapshot.ref.id}">×</button>
</td>
    
</tr>
`
                        );
                    });
                }
            },
            "md": class extends AjaxFragment {
                constructor() {
                    super("frames/delete-custom-meta.html");
                }

                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#next").on("click", async() => {
                        try {
                            this.showOverlay();
                            console.log(this._meta)
                            let tasks = await FirestoreUtils.userDocument.collection("task")
                                .orderBy("meta." + this._meta.id).get();
                            console.log(tasks.docs)
                            tasks.docs.forEach(task => {
                                let object = {}
                                object["meta." + this._meta.id] = firebase.firestore.FieldValue.delete();
                                task.ref.update(object);
                            })

                            await this._meta.delete();
                            this.hideOverlay();
                            ToastUtils.showToast("メタを削除しました");
                            this.escape();
                        } catch (e) {
                            console.error(e);
                            ToastUtils.showToast("削除に失敗！")
                        }
                    });
                    this._metaNameBox = view.find("#meta-name");
                }

                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._meta = FirestoreUtils.userDocument.collection("custom-meta").doc(state.state);
                            this._metaNameBox.text((await this._meta.get()).data().name);
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }

                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._meta.id;
                }
            },

            "m": class extends AjaxFragment {
                constructor() {
                    super("frames/meta-detail.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#next").on("click", async() => {
                        let type = this._meta.getProperty("type");
                        if (type === Meta.EXIST || (type === Meta.ENUM && this._meta.getProperty("value"))) {
                            this.showOverlay();
                            await this._meta.finishEditing();
                            this.hideOverlay();
                            ToastUtils.showToast("カスタムメタが保存されました");
                            this.escape();
                        } else {
                            ToastUtils.showToast("入力漏れがあります！")
                        }
                    });
                    this._nameBox = view.find("#meta-name");
                    this._typeBox = view.find("#meta-type");
                    this._valueBox = view.find("#meta-value");
                    this._valueRow = view.find("#value-row");
                    view.find("#name-edit").on("click", () => {
                        this.push("mn-" + new State(this._meta.getDocId()).convertToText());
                    });
                    view.find("#type-edit").on("click", () => {
                        this.push("mt-" + new State(this._meta.getDocId()).convertToText());
                    });
                    view.find("#value-edit").on("click", () => {
                        this.push("mv-" + new State(this._meta.getDocId()).convertToText());
                    })
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._metaDocId = state.state;
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }
                async onResume() {
                    if (this._metaDocId) {
                        //this._meta = new CustomMeta.Builder(this._metaDocId).build();
                        this._meta = new Meta(this._metaDocId);
                        await this._meta.getInitPromise();
                        this._nameBox.text(this._meta.getName());
                        this._typeBox.text(this._meta.getTypeName());
                        if (this._meta.getType() === Meta.ENUM) {
                            this._valueRow.show();
                            this._valueBox.text(JSON.stringify(this._meta.getValue()));
                        } else {
                            this._valueRow.hide();
                        }
                    }
                }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._metaDocId;
                }
            },

            "mn": class extends MapFragmentFactory.OneTextBoxFragment {
                constructor() {
                    super("カスタムメタの名前を編集", "名前", "名前は2文字から40文字まで入力できます")
                }
                async onAccept(text) {
                    this._meta.setName(text);
                    this.escape();
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._metaDocId = state.state;
                        }
                        if (this._metaDocId) {
                            this._meta = new Meta(this._metaDocId);
                            await this._meta.getInitPromise();
                            this.getTextBox().val(this._meta.getName());
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._metaDocId;
                }

                /*constructor() {
                    super("frames/edit-meta-name.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    this._nameBox = view.find("#custom-meta-name-input");
                    view.find("#next").on("click", () => {
                        this._meta.setName(this._nameBox.val());
                        this.escape();
                    })
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._metaDocId = state.state;
                        }
                    } catch (e) {
                        console.log(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }
                async onResume() {
                    if (this._metaDocId) {
                        this._meta = new Meta(this._metaDocId);
                        await this._meta.getInitPromise();
                        this._nameBox.val(this._meta.getName());
                    }
                }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._metaDocId;
                }*/
            },
            "tc": class extends MapFragmentFactory.OneTextBoxFragment {
                constructor() {
                    super("新しいタスクを作成", "タイトル", "タイトルは2文字から40文字まで入力できます")
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    this.getTextBox().attr("maxlength", "40");
                    if (FirestoreUtils.userDocument) {
                        let editing = await FirestoreUtils.userDocument.collection("task")
                            .where("editing", "==", true)
                            .limit(1)
                            .get();
                        if (editing.size > 0) {
                            this.getTextBox().val(editing.docs[0].get("title"));
                            ToastUtils.showToast("編集中のタスクから状態を復元しました");
                        }
                    }
                }
                async onAccept(text) {
                    try {
                        let task = await this.createNewTask(text);
                        this.replace("t-" + new State(task.getDocId()).convertToText());
                    } catch (e) {
                        ToastUtils.showToast(e);
                        console.error(e);
                    }
                }
                async createNewTask(title) {
                    if (title.length < 2 || title.length > 40 || QueryUtils.isContainsBadChar(title)) {
                        throw '<span class="text-warning">タスクの名前が不正です</span>'
                    }
                    let doc = await FirestoreUtils.userDocument.collection("task")
                        .where("title", "==", title)
                        .limit(1)
                        .get();
                    if (doc.size) {
                        let ret = new Task(doc.docs[0].id);
                        await ret.getInitPromise();
                        return ret;
                        //return new CustomMeta.Builder(doc.docs[0].id).build();
                    } else {
                        let ret = new Task();
                        await ret.getInitPromise();
                        await ret.setTitle(title);
                        return ret;
                        //return new CustomMeta.Builder().setName(name).build();
                    }
                }
            },
            "tt": class extends MapFragmentFactory.OneTextBoxFragment {
                constructor() {
                    super("タスクのタイトルを編集", "タイトル", "2文字から40文字まで入力できます")
                }
                async onAccept(text) {
                    this._task.setTitle(text);
                    this.escape();
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._taskDocId = state.state;
                        }
                        if (this._taskDocId) {
                            this._task = new Task(this._taskDocId);
                            await this._task.getInitPromise();
                            this.getTextBox().val(this._task.getTitle());
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._taskDocId;
                }
            },
            "te": class extends MapFragmentFactory.OneTextBoxFragment {
                constructor() {
                    super("タスクの説明を編集", "説明", "2文字から40文字まで入力できます", true)
                }
                async onAccept(text) {
                    this._task.setDescription(text);
                    this.escape();
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._taskDocId = state.state;
                        }
                        if (this._taskDocId) {
                            this._task = new Task(this._taskDocId);
                            await this._task.getInitPromise();
                            this.getTextBox().val(this._task.getDescription());
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._taskDocId;
                }
            },
            "t": class extends AjaxFragment {
                constructor() {
                    super("frames/task-detail.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#next").on("click", async() => {
                        if (this._task.getDate()) {
                            this.showOverlay();
                            await this._task.finishEditing();
                            ToastUtils.showToast("タスクが保存されました");
                            this.escape();
                            this.hideOverlay();
                        } else {
                            ToastUtils.showToast("タスクの終了を指定してください")
                        }
                    });
                    this._titleBox = view.find("#title");
                    this._descriptionBox = view.find("#description");
                    this._dateBox = view.find("#date");
                    this._taskMeta = view.find("#task-meta");
                    let outerThis = this;
                    this._statusBox = view.find("#status");
                    this._subTaskBox = view.find("#subtask-list")
                    this._prefix = String(Math.random()).substring(2);
                    view.find("#status input").each((i, e) => {
                        let element = $(e)
                        element.attr("id", this._prefix + element.attr("id"))
                    })
                    view.find("#status label").each((i, e) => {
                        let element = $(e)
                        element.attr("for", this._prefix + element.attr("for"))
                    })
                    this._statusBox.on("click", "label[_for]", function() {
                        outerThis._task.setStatus({
                            "status-canceled": Task.CANCELED,
                            "status-on-hold": Task.ON_HOLD,
                            "status-new": Task.NEW,
                            "status-in-progress": Task.IN_PROGRESS,
                            "status-completed": Task.COMPLETED
                        }[$(this).attr("_for")]);
                    })
                    this._typeBox = view.find("#type");
                    this._typeBox.on("change", event => {
                        outerThis._task.setType(parseInt({ "task": 0, "schedule": 1 }[$(event.target).val()]));
                    })

                    view.find("#name-edit").on("click", () => {
                        this.push("tt-" + new State(this._task.getDocId()).convertToText());
                    });
                    view.find("#description-edit").on("click", () => {
                        this.push("te-" + new State(this._task.getDocId()).convertToText());
                    });
                    view.find("#date-edit").on("click", () => {
                        this.push("ta-" + new State(this._task.getDocId()).convertToText());
                    });
                    view.find("#task-meta").on("click", "button[meta-delete]", function() {
                        outerThis.push("tm-" +
                            new State(outerThis._task.getDocId()).convertToText() +
                            "-" +
                            new State($(this).attr("meta-delete")).convertToText());
                    })
                    view.find("#add-meta").on("click", () => {
                        this.push("tr-" + new State(this._task.getDocId()).convertToText());
                    })
                    view.find("#delete").on("click", () => {
                        this.push("td-" + new State(this._task.getDocId()).convertToText());
                    });
                    view.find("#add-subtask").on("click", () => {
                        this.push("sc-" + new State(this._task.getDocId()).convertToText());
                    })
                }

                async onResume() {
                    if (this._taskDocId) {
                        //this._meta = new CustomMeta.Builder(this._metaDocId).build();
                        this._task = new Task(this._taskDocId);
                        await this._task.getInitPromise();
                        if (!(this._task.exists() && this._task.isAvailable() || this._task.isEditing())) {
                            this.escape();
                        }
                        this._titleBox.text(this._task.getTitle());
                        this._descriptionBox.text(this._task.getDescription());
                        this._dateBox.text(this._task.getDateText());
                        this._statusBox.find(
                                ["#" + this._prefix + "status-canceled",
                                    "#" + this._prefix + "status-on-hold",
                                    "#" + this._prefix + "status-new",
                                    "#" + this._prefix + "status-in-progress",
                                    "#" + this._prefix + "status-completed"
                                ]
                                [this._task.getStatus()])
                            .prop("checked", true);
                        this._typeBox.val(
                            ["task", "schedule"]
                            [this._task.getType()]);
                        this._subTaskBox.empty();
                        let subTasks = this._task.getSubTasks();
                        for (let subTask in subTasks) {
                            let task = new Task(subTasks[subTask]);
                            await task.getInitPromise();
                            this._subTaskBox.append("<tr><td>" + task.getPreviewHtml() + "</td></tr>");
                        }
                        this._taskMeta.empty();
                        let metas = this._task.getMeta();
                        for (let key in metas) {
                            let meta = new Meta(key);
                            await meta.getInitPromise();
                            let select = '<select class="form-select">';
                            let values = meta.getValue();
                            let row = $(`
                            <tr class="position-relative">
                                <td>
                                    ${meta.getName()}
                                </td> 
                            </tr>
                            `)
                            if (values) {
                                meta.getValue().forEach(value => {
                                    select += `<option value="${value}">${value}</option>`
                                })
                                select += '</select>'

                                let selectElement = $(select)
                                selectElement.val(metas[key]);
                                selectElement.on("change", event => {
                                    this._task.setMeta(meta.getDocId(), $(event.target).val())
                                })
                                let col = $('<td></td>')
                                col.append(selectElement);
                                row.append(col);
                            } else {
                                row.append("<td>EXIST</td>");
                            }
                            row.append(`<td><button class="btn btn-sm btn-danger" meta-delete="${meta.getDocId()}">X</button></td>`);
                            this._taskMeta.append(row);
                        }

                    }
                }

                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._taskDocId = state.state;
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._taskDocId;
                }
            },
            "ta": class extends AjaxFragment {
                constructor() {
                    super("frames/edit-task-date.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#next").on("click", async() => {
                        this.showOverlay();
                        await this._task.setDate(this._timescale,
                            this._year.val(),
                            this._month.val(),
                            this._day.val(),
                            this._hour.val(),
                            this._min.val(),
                            this._sec.val(),
                            this._ms.val()
                        );
                        this.hideOverlay();
                        ToastUtils.showToast("日時が保存されました");
                        this.escape();
                    });
                    this._dateEdit = [
                        view.find(".scale-0"),
                        view.find(".scale-1"),
                        view.find(".scale-2"),
                        view.find(".scale-3"),
                        view.find(".scale-4"),
                        view.find(".scale-5"),
                        view.find(".scale-6")
                    ];
                    this._timescale = Task.DAY;
                    this.setTimeScale()
                    view.find("#dwscale").on("click", () => { this.dwscale() });
                    view.find("#upscale").on("click", () => { this.upscale() });
                    this._ms = view.find("#ms")
                    this._sec = view.find("#sec")
                    this._min = view.find("#min")
                    this._hour = view.find("#hour")
                    this._day = view.find("#day")
                    this._month = view.find("#month")
                    this._year = view.find("#year")
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._taskDocId = state.state;
                        }
                        if (this._taskDocId) {
                            this._task = new Task(this._taskDocId);
                            await this._task.getInitPromise();
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }
                async onResume() {
                    if (this._taskDocId) {
                        //this._meta = new CustomMeta.Builder(this._metaDocId).build();
                        this._task = new Task(this._taskDocId);
                        await this._task.getInitPromise();
                        let taskDate = this._task.getDate();
                        if (taskDate) {
                            this._year.val(taskDate.getFullYear());
                            this._month.val(taskDate.getMonth());
                            this._day.val(taskDate.getDate());
                            this._hour.val(taskDate.getHours());
                            this._min.val(taskDate.getMinutes());
                            this._sec.val(taskDate.getSeconds());
                            this._ms.val(taskDate.getMilliseconds());
                        } else {
                            let now = new Date();
                            this._year.val(now.getFullYear());
                            this._month.val(now.getMonth());
                            this._day.val(now.getDate());
                        }

                        let timescale = this._task.getTimeUnit();
                        if (timescale >= 0) {
                            this._timescale = timescale;
                            this.setTimeScale(timescale);
                        }
                    }
                }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._taskDocId;
                }
                setTimeScale(scale = this._timescale) {
                    this._dateEdit.forEach(element => {
                        element.hide();
                    });
                    switch (scale) {
                        case Task.MS:
                            this._dateEdit[Task.MS].show();
                        case Task.SEC:
                            this._dateEdit[Task.SEC].show();
                        case Task.MIN:
                            this._dateEdit[Task.MIN].show();
                        case Task.HOUR:
                            this._dateEdit[Task.HOUR].show();
                        case Task.DAY:
                            this._dateEdit[Task.DAY].show();
                        case Task.MONTH:
                            this._dateEdit[Task.MONTH].show();
                        case Task.YEAR:
                            this._dateEdit[Task.YEAR].show();
                    }
                }
                dwscale() {
                    this._timescale++;
                    if (this._timescale > Task.YEAR) {
                        this._timescale = Task.YEAR;
                    }
                    this.setTimeScale(this._timescale)
                }
                upscale() {
                    this._timescale--;
                    if (this._timescale < Task.MS) {
                        this._timescale = Task.MS;
                    }
                    this.setTimeScale(this._timescale)
                }
            },
            "tm": class extends AjaxFragment {
                constructor() {
                    super("frames/delete-task-meta.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    this._taskBox = view.find("#task-name");
                    this._metaBox = view.find("#meta-name");
                    view.find("#next").on("click", async() => {
                        this.showOverlay();
                        await this._task.setMeta(this._meta.getDocId(), null);
                        this.hideOverlay();
                        ToastUtils.showToast("紐づけが解除されました")
                        this.escape();
                    })
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            let taskMeta = state.state.split("-");
                            this._task = new Task(taskMeta[0]);
                            this._meta = new Meta(taskMeta[1]);
                            await this._task.getInitPromise();
                            this._taskBox.text(this._task.getTitle());
                            await this._meta.getInitPromise();
                            this._metaBox.text(this._meta.getName());
                        }
                    } catch (e) {
                        ToastUtils.showToast(e);
                        console.error(e);
                    }
                }
            },
            "tr": class extends AjaxFragment {
                constructor() {
                    super("frames/task-meta-create.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#custom-meta-search").on("input", () => {
                        if (this._inputTimer) {
                            clearTimeout(this._inputTimer);
                        }
                        this._inputTimer = setTimeout(async() => {
                            let searchText = this._searchBox.val();
                            if (!QueryUtils.isContainsBadChar(searchText)) {
                                this._searchText = searchText;
                                this.invalidateHash();
                                if (FirestoreUtils.userDocument) {
                                    let result = await this.queryCustomMetaFrom(searchText);
                                    this.setCustomMetaList(result.docs);
                                }
                            }
                        }, 1000);
                    });
                    this._searchBox = view.find("#custom-meta-search");
                    this._list = view.find("#custom-meta-list-tbody");
                    let outerThis = this;

                    this._list.on("click", "button[custom-meta]", async function() {
                        outerThis.showOverlay();
                        let metaDoc = $(this).attr("custom-meta");
                        let meta = new Meta(metaDoc);
                        await meta.getInitPromise();
                        let type = meta.getType();
                        if (type === Meta.EXIST) {
                            outerThis._task.setMeta(meta.getDocId(), true);
                        } else if (type === Meta.ENUM) {
                            outerThis._task.setMeta(meta.getDocId(), meta.getValue()[0]);
                        }
                        outerThis.escape();
                        outerThis.hideOverlay();
                    })
                }
                async onResume() {
                    super.onResume();
                    if (FirestoreUtils.userDocument) {
                        let result = await this.queryCustomMetaFrom(this._searchBox.val());
                        this.setCustomMetaList(result.docs);
                    }
                }

                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._taskDocId = state.state;
                            this._task = new Task(this._taskDocId);
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }

                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._taskDocId;
                }

                queryCustomMetaFrom(text) {
                    let query = FirestoreUtils.userDocument.collection("custom-meta")
                        .limit(10);
                    if (text.length >= 2) {
                        query = QueryUtils.buildSearchQuery(text, "bi-gram", query);
                    }
                    return query.get();
                }
                setCustomMetaList(list) {
                    this._list.empty();
                    list.forEach((snapshot) => {
                        let data = snapshot.data();
                        this._list.append(
                            `<tr class="position-relative">
<td>
    ${data.name}
</td>
<td class="text-uppercase">
    ${Meta.TYPE_TEXT[data.type]}
</td>
<td class="text-end">
    <button class="btn btn-sm btn-primary stretched-link" custom-meta="${snapshot.ref.id}">選択</button>
</td>
    
</tr>
`
                        );
                    });
                }
            },
            "tl": class extends AjaxFragment {
                constructor() {
                    super("frames/tasks.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#task-search").on("input", () => {
                        if (this._inputTimer) { clearTimeout(this._inputTimer); }
                        this._inputTimer = setTimeout(async() => {
                            let searchText = this._searchBox.val();
                            if (!QueryUtils.isContainsBadChar(searchText)) {
                                this._searchText = searchText;
                                this.invalidateHash();
                                if (FirestoreUtils.userDocument) {
                                    let result = await this.queryTaskFrom(searchText);
                                    this.setTaskList(result.docs);
                                }
                            }
                        }, 1000);
                    });
                    this._searchBox = view.find("#task-search");
                    this._list = view.find("#task-list-tbody");
                    this._list.on("click", "button[task-delete]", function() {
                        let taskDoc = $(this).attr("task-delete");
                        manager.push("td-" + new State(taskDoc).convertToText());
                    });
                    this._list.on("click", "button[task-detail]", function() {
                        let taskDoc = $(this).attr("task-detail");
                        manager.push("t-" + new State(taskDoc).convertToText());
                    })
                }
                async onResume() {
                    super.onResume();
                    if (FirestoreUtils.userDocument) {
                        let result = await this.queryTaskFrom(this._searchBox.val());
                        this.setTaskList(result.docs);
                    }
                }
                async onChangeState(old, state) { try { if (state.state) { this._searchBox.val(state.state); } } catch (e) { console.error(e); } }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._searchText;
                }
                queryTaskFrom(text) {
                    let query = FirestoreUtils.userDocument.collection("task")
                        .limit(10)
                        .where("available", "==", true);
                    if (text.length >= 2) {
                        query = QueryUtils.buildSearchQuery(text, "bi-gram", query);
                    }
                    return query.get();
                }
                setTaskList(list) {
                    this._list.empty();
                    list.forEach((snapshot) => {
                        let data = snapshot.data();
                        this._list.append(`
<tr class="position-relative">
    <td>
        ${data.title}
    </td>
    <td class="text-uppercase">
        ${data.date?DateTexter.convertDateToText(data.date.toDate(),data["time-unit"]):"UNDEF"}
    </td>
    <td class="text-end">
        <button class="btn btn-sm btn-primary" task-detail="${snapshot.ref.id}">詳細</button>
        <button class="btn btn-sm btn-danger" task-delete="${snapshot.ref.id}">×</button>
    </td>

</tr>
`);
                    });
                }
            },
            "td": class extends AjaxFragment {
                constructor() {
                    super("frames/delete-task.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    view.find("#next").on("click", async() => {
                        try {
                            this.showOverlay();
                            await this._task.delete();
                            this.hideOverlay();
                            ToastUtils.showToast("タスクを削除しました");
                            this.escape();
                        } catch (e) {
                            console.error(e);
                            ToastUtils.showToast("削除に失敗！")
                        }
                    });
                    this._taskNameBox = view.find("#task-name");
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._task = new Task(state.state);
                            await this._task.getInitPromise();
                            this._taskNameBox.text(this._task.getTitle());
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._task.getDocId();
                }

            },
            "app": class extends AjaxFragment {
                constructor() {
                    super("frames/task-query.html");
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    let outerThis = this;
                    this._sortSearch = view.find("#sort-search");
                    this._sortSearchSelect = view.find("#sort-search-select");
                    this._sortSearchSelect.find(".sort,.search").on("click", async() => {
                        await Sleeper.sleep(1000);
                        this.invalidateHash();
                        this.queryTask();
                    })
                    this._taskSort = view.find("#task-sort")
                    this._taskSort.on("change", () => {
                        this.invalidateHash();
                        this.queryTask();
                    })
                    this._taskSearch = view.find("#task-search");
                    this._taskSearch.on("input", () => {
                        if (this._inputTimer) {
                            clearTimeout(this._inputTimer);
                        }
                        this._inputTimer = setTimeout(() => {
                            this.invalidateHash();
                            this.queryTask();
                        }, 1000);
                    })
                    this._canceled = view.find("#search-status-canceled");
                    this._onHold = view.find("#search-status-on-hold");
                    this._new = view.find("#search-status-new");
                    this._inProgress = view.find("#search-status-in-progress");
                    this._completed = view.find("#search-status-completed");
                    this._type = view.find("#search-type");
                    this._type.on("change", () => {
                        this.invalidateHash();
                        this.queryTask();
                    })
                    this._status = view.find("#status-search");
                    this._status.on("change", () => {
                        this.invalidateHash();
                        this.queryTask();
                    })
                    this._list = view.find("#task-list");
                    this._searchMetaList = view.find("#search-meta-list");
                    this.addMetaElement();
                }
                async onChangeState(old, state) {
                    try {
                        if (state.state) {
                            let separated = state.state.split("-");
                            let bit = { ".": 0, "*": 1 };
                            this._sortSearch.find("#task-sort").val(separated[0]);
                            this._sortSearch.find("#task-search").val(separated[1]);
                            if (separated[2].charAt(0) === ".") this._canceled.prop("checked", false);
                            if (separated[2].charAt(1) === ".") this._onHold.prop("checked", false);
                            if (separated[2].charAt(2) === ".") this._new.prop("checked", false);
                            if (separated[2].charAt(3) === ".") this._inProgress.prop("checked", false);
                            if (separated[2].charAt(4) === ".") this._completed.prop("checked", false);
                            this._type.val(separated[3])
                        }
                    } catch (e) {
                        console.error(e)
                        ToastUtils.showToast("パラメータ不正！")
                    }
                }
                async onResume() {
                    if (FirestoreUtils.userDocument) {
                        await this.queryTask();
                    }
                }
                async queryTask(noInvalidate = true) {
                    if (!noInvalidate) this.invalidateHash();
                    let query = FirestoreUtils.userDocument.collection("task")
                    query = query.limit(10);
                    query = query.where("available", "==", true);
                    query = query.where("parent", "==", null)

                    let sortSearchBox = this._sortSearch.find(".active .form-control");
                    if ({ "task-sort": true, "task-search": false }[sortSearchBox.attr("id")]) {
                        let type = sortSearchBox.val();
                        if (type === "dd") {
                            query = query.orderBy("date", "desc");
                        } else if (type === "da") {
                            query = query.orderBy("date", "asc");
                        } else if (type === "nd") {
                            query = query.orderBy("title", "desc");
                        } else if (type === "na") {
                            query = query.orderBy("title", "asc");
                        }
                    } else {
                        query = QueryUtils.buildSearchQuery(sortSearchBox.val(), "bi-gram", query)
                        this._searchMetaList.find(".search-meta").each((e, t) => {
                            let element = $(t)
                            let input = element.find("input")
                            let select = element.find("select")
                            let doc = input.attr("meta-doc")
                            if (doc) {
                                if (!select.attr("disabled")) {
                                    query = query.where("meta." + doc, "==", select.val())
                                } else {
                                    query = query.where("meta." + doc, "==", true)
                                }
                            }
                        })
                    }
                    let status = [];
                    if (this._canceled.is(':checked')) status.push(Task.CANCELED)
                    if (this._onHold.is(':checked')) status.push(Task.ON_HOLD)
                    if (this._new.is(':checked')) status.push(Task.NEW)
                    if (this._inProgress.is(':checked')) status.push(Task.IN_PROGRESS)
                    if (this._completed.is(':checked')) status.push(Task.COMPLETED)
                    if (status.length > 0) {
                        query = query.where("status", "in", status);
                    } else {
                        query = query.where("status", "in", [0, 1, 2, 3, 4])
                    }

                    let type = this._type.val()
                    if (type === "task") {
                        query = query.where("type", "==", Task.TASK)
                    } else if (type === "schedule") {
                        query = query.where("type", "==", Task.SCHEDULE)
                    }

                    let result = await query.get();
                    this._list.empty();
                    result.docs.forEach(doc => {
                        let task = new Task(doc.ref.id, true)
                        task._properties = doc.data()
                        this._list.append(task.getPreviewHtml())
                    })

                }
                addMetaElement() {
                    let input = $('<input type="search" class="form-control meta" maxlength="40" placeholder="メタ名" value="">');
                    let col = $("<td></td>");
                    col.append(input);
                    let col2 = $("<td></td>");
                    let select = $('<select class="form-control" disabled="1"></select>');
                    col2.append(select);
                    let row = $('<tr class="search-meta"></tr>');
                    row.append(col);
                    row.append(col2);

                    input.autocomplete({
                        source: async function(req, res) {
                            if (!QueryUtils.isContainsBadChar(req.term)) {
                                let query = FirestoreUtils.userDocument.collection("custom-meta")
                                    .limit(3);
                                if (req.term.length >= 2) {
                                    query = QueryUtils.buildSearchQuery(req.term, "bi-gram", query);
                                }
                                let result = await query.get();
                                //this.setCustomMetaList(result.docs);
                                let resultNames = [];
                                result.docs.forEach(doc => {
                                    resultNames.push(doc.data().name)
                                });
                                res(resultNames)
                            }
                        },
                        autoFocus: true,
                        delay: 1000,
                        minLength: 2,
                        select: async(event, value) => {
                            value = value.item.value
                            let snapshot = await FirestoreUtils.userDocument.collection("custom-meta").limit(1).where("name", "==", value).get();
                            input.removeAttr("meta-doc");
                            if (snapshot.size > 0) {
                                let data = snapshot.docs[0].data()
                                input.attr("meta-doc", snapshot.docs[0].ref.id);
                                if (data.type === Meta.ENUM) {
                                    select.empty();
                                    data.value.forEach(value => {
                                        select.append('<option value="' + value + '">' + value + '</option>');
                                    });
                                    select.removeAttr('disabled');
                                } else {
                                    select.attr("disabled", "1")
                                }
                                this.queryTask();
                            }
                        }
                    })
                    input.on("input", () => {
                        if (this._inputTimer) {
                            clearTimeout(this._inputTimer);
                        }
                        this._inputTimer = setTimeout(() => {
                            let value = input.val();
                            this._searchMetaList.find('input:placeholder-shown').parent().parent().remove();
                            this.invalidateHash();
                            this.queryTask();
                            let next = this.addMetaElement();
                        }, 1000);
                    });
                    select.on("change", () => {
                        this.invalidateHash();
                        this.queryTask();
                    })

                    this._searchMetaList.append(row);
                    return input;
                }
                onSaveState(state) {
                    let sortBox = this._sortSearch.find("#task-sort");
                    let searchBox = this._sortSearch.find("#task-search")
                    let bit = [".", "*"]
                    state.state = `${
                        sortBox.val()
                    }-${
                        searchBox.val()
                    }-${
                        this._canceled.is(':checked')?bit[1]:bit[0]
                    }${
                        this._onHold.is(':checked')?bit[1]:bit[0]
                    }${
                        this._new.is(':checked')?bit[1]:bit[0]
                    }${
                        this._inProgress.is(':checked')?bit[1]:bit[0]
                    }${
                        this._completed.is(':checked')?bit[1]:bit[0]
                    }-${
                        this._type.val()
                    }`
                }
            },
            "sc": class extends MapFragmentFactory.OneTextBoxFragment {
                constructor() {
                    super("サブタスクを作成", "説明", "2文字から40文字まで入力できます")
                }
                async onAccept(text) {
                    try {
                        let task = await this.createNewTask(text);
                        this.replace("t-" + new State(task.getDocId()).convertToText());
                    } catch (e) {
                        ToastUtils.showToast(e);
                        console.error(e);
                    }
                }
                async createNewTask(title) {
                    if (title.length < 2 || title.length > 40 || QueryUtils.isContainsBadChar(title)) {
                        throw '<span class="text-warning">タスクの名前が不正です</span>'
                    }
                    let ret = new Task();
                    await ret.getInitPromise();
                    await ret.setTitle(title);
                    await ret.setProperty({ "date": this._task.getDate(), "time-unit": this._task.getTimeUnit() });
                    await ret.setParent(this._task.getDocId());
                    await this._task.addSubtask(ret.getDocId());
                    return ret;
                }
                async onViewCreated(view) {
                    await super.onViewCreated(view);
                    this.getTextBox().attr("maxlength", "40");
                }
                async onChangeState(old, state) {
                    try {
                        if (FirestoreUtils.userDocument && state.state) {
                            this._taskDocId = state.state;
                        }
                        if (this._taskDocId) {
                            this._task = new Task(this._taskDocId);
                            await this._task.getInitPromise();
                            this.getTextBox().attr("placeholder", this._task.getTitle() + "のサブタスク名...")
                        }
                    } catch (e) {
                        console.error(e);
                        ToastUtils.showToast("パラメータ不正！");
                    }
                }
                onSaveState(state) {
                    super.onSaveState(state);
                    state.state = this._taskDocId;
                }
            }
        }

        addFragmentClass(classObject, name) {
            _map[name] = classObject;
        }

        newFragment(fragmentName) {
            if (this._map[fragmentName]) {
                let ret = new this._map[fragmentName];
                ret._fragmentName = fragmentName;
                return ret;
            } else {
                let ret = new this._map["404"];
                ret._fragmentName = fragmentName;
                return ret;
            }
        }
        getFragmentName(fragment) {
            return fragment._fragmentName;
        }
    }

    manager = new FragmentManager($("#fragment-container"), new MapFragmentFactory());

    // ボタン要素のクリックイベント

    $(document).on("click", "a.pop,button.pop,input.pop", function() {
        manager.pop();
    });
    $(document).on("click", "a.back,button.back,input.back", function() {
        history.back();
    });
    $(document).on("click", "a[push],button[push],input[push]", function() {
        manager.push($(this).attr("push"));
    });
    $(document).on("click", "a[replace],button[replace],input[replace]", function() {
        manager.replace($(this).attr("replace"));
    });


    // ログイン・ログアウト時に発火
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in, see docs for a list of available properties
            // https://firebase.google.com/docs/reference/js/firebase.User
            if (user.photoURL === null) {
                $("#nav-user-icon img").attr("src", "/icons/default-icon.png");
            } else {
                $("#nav-user-icon img").attr("src", user.photoURL);
            }
            $("body").removeClass("not-signined").addClass("signined");
            manager.invalidateFragments();
        } else {
            // User is signed out
            // ...
            $("body").removeClass("signined").addClass("not-signined");
            // manager.invalidateFragments();
        }
    });
    // メインのページはabout
    if (!Hash.get()) {
        Hash.replace("about");
    }
})();