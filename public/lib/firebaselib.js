// このファイルはシステム関係のライブラリ

class AnalyticsUtils {
    // firebase analyticsの初期化
    static analytics = firebase.analytics();
}

class FirestoreUtils {
    // firebase firestoreの初期化
    static db = firebase.firestore();

    // firease authのuidを保持
    static uid;

    // firestoreの自分のDocumentを保持
    static userDocument;


    static async _initDatabase() {
        let userQuerySnapshot = await this.db.collection("user")
            .where("uid", "==", this.uid)
            .limit(1)
            .get();
        if (userQuerySnapshot.size == 0) {
            this.userDocument = this.db.collection("user").doc();
            this.userDocument.set({
                "uid": this.uid,
                "name": firebase.auth().currentUser.displayName
            });
            console.log("User's database initialized.");
        } else {
            this.userDocument = userQuerySnapshot.docs[0].ref;
            console.log("User's database has already been initialized.");
        }
    }

    static staticInitialize() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.warn("警告！このコンソールを使用すると、self-xssと呼ばれる手法を使ってあなたの情報が盗み取られる可能性があります。\nこのコンソールを使用したことにより、あなたが不利益を被った場合、開発者は責任を負いません。\nそれでもかまわない場合は、自己責任にてこのコンソールを使用することを許可しますが、その場合においても、当然開発者は責任を負いません。");
                this.uid = user.uid;
                this._initDatabase()
                    .then(() => {
                        console.log("Database initialize success.");
                    })
                    .catch((error) => {
                        console.log("Database initialize fail.");
                        console.error(error);
                    });
            } else {
                this.uid = null;
                this.userDocument = null;
            }
        });
    }
}
FirestoreUtils.staticInitialize();
/**
 * @非推奨
 * 実装が適当なため、使用をお勧めしません。
 * Metaクラスを使用して下さい。
 *
 * @class CustomMeta
 */
class CustomMeta {

    static Builder = class {
        constructor(documentId = null) {
            if (documentId) {
                this._documentRef = FirestoreUtils.userDocument.collection("custom-meta").doc(documentId);
            } else {
                this._documentRef = FirestoreUtils.userDocument.collection("custom-meta").doc();
                this._documentRef.set({ "editing": true });
            }

        }
        setName(name) {
            this._name = name;
            return this;
        }
        setType(type) {
            this._type = type;
            return this;
        }
        setValue(value) {
            this._value = value;
            return this;
        }
        build() {
            return new CustomMeta(this._name, this._type, this._value, this._documentRef);
        }
    }
    constructor(name, type, value, documentRef) {
        this._name = name;
        this._type = type;
        this._value = value;
        this._documentRef = documentRef;
        this._loadPromise = documentRef.get();
        this._loadPromise.then((snapshot) => {
            let data = snapshot.data();
            if (name) {
                this.setName(name);
            } else {
                this.setName(data["name"]);
            }
            if (type) {
                this.setType(type);
            } else {
                this.setType(data["type"]);
            }
            if (value) {
                this.setValue(value);
            } else {
                this.setValue(data["value"]);
            }
        });
    }
    setName(name) {
        if (name) {
            if (name.length < 2 || name.length > 40 || QueryUtils.isContainsBadChar(name)) {
                throw '<span class="text-warning">カスタムメタの名前が不正です</span>'
            }

            this._name = name;
            this._documentRef.update({
                "name": name
            });

            this.updateBiGram();
        }
    }
    setType(type) {
        if (type) {
            this._type = type;
            this._documentRef.update({ "type": type });
        }
    }
    setValue(value) {
        if (value) {
            this._value = value;
            this._documentRef.update({ "value": value });
            this.updateBiGram();
        }
    }
    getName() { return this._name; }
    getType() { return this._type; }
    getValue() { return this._value; }
    getDocumentRef() { return this._documentRef }
    updateBiGram() {
        let biGram = BiGram.createBiGramObject(this._name);
        if (this._value) {
            this._value.forEach(value => {
                Object.assign(biGram, BiGram.createBiGramObject(value))
            })
        }
        this._documentRef.update({
            "bi-gram": Object.keys(biGram)
        });
    }

    finishEditing() {
        this._documentRef.update({ "editing": false });
    }
}

class QueryUtils {
    /**
     * 検索クエリを構築します。
     * 検索は、ビグラムを用いて行われます。
     *
     * @static
     * @param {string} text 検索テキスト
     * @param {string} map bi-gramが入っているfieldの場所
     * @param {Query} query 構築するQueryのインスタンス
     * @return {Query} 構築されたQuery
     * @memberof QueryUtils
     */
    static buildSearchQuery(text, field, query) {
        // let biText = BiGram.createBiGramArray(text.substring(0, 9));
        let biText = BiGram.createBiGramArray(text);
        biText.forEach((bi) => {
            query = query.where(`${field}.${bi}`, "==", true);
            // query = query.where(field, "array-contains", bi);
        });
        // query = query.where(field, "array-contains-any", biText);
        return query;
    }
    static isContainsBadChar(text) {
        return text.match(".*\\..*") ||
            text.match(".*\\/.*") ||
            text.match(".*\\*.*") ||
            text.match(".*\\~.*") ||
            text.match(".*\\[.*") ||
            text.match(".*\\].*");
    }

}

class FirestoreDocument {
    constructor(documentRef) {
        this._documentRef = documentRef;
    }
    _properties = {};
    async initialize(doInitialize) {
        //console.log("get operation :" + this.getDocumentRef().id)
        let result = await this._documentRef.get()
        this._exists = result.exists;
        this._properties = result.data();
        if (!this._properties) {
            if (doInitialize) {
                this._properties = { "editing": true };
                this._documentRef.set(this._properties);
            } else {
                this._properties = {}
            }
        }
    }
    async setProperty(newProps) {
        Object.assign(this._properties, newProps);
        await this._documentRef.update(newProps);
    }
    exists() {
        return this._exists;
    }
    getProperty(key) {
        return this._properties[key];
    }
    getDocumentRef() { return this._documentRef }
    isEditing() { return this.getProperty('editing'); }
    finishEditing() {
        return this.setProperty({ "editing": false });
    }
    getDocId() {
        return this.getDocumentRef().id
    }
}

class Task extends FirestoreDocument {
    static MS = 0;
    static SEC = 1;
    static MIN = 2;
    static HOUR = 3;
    static DAY = 4;
    static MONTH = 5;
    static YEAR = 6;

    static TIME_UNIT = ["ミリ秒", "秒", "分", "時", "日", "月", "年"];

    static CANCELED = 0;
    static ON_HOLD = 1;
    static NEW = 2;
    static IN_PROGRESS = 3;
    static COMPLETED = 4;

    static STATUS = ["廃止", "休止", "新規", "進行", "完了"];

    static TASK = 0;
    static SCHEDULE = 1;

    static TYPE = ["タスク", "予定"];

    constructor(docId, noInitialize) {
        super(docId ?
            FirestoreUtils.userDocument.collection("task").doc(docId) :
            FirestoreUtils.userDocument.collection("task").doc());
        if (!noInitialize) {
            this._initPromise = this.initialize(!docId);
        }
    }
    async addSubtask(taskId) {
        let array = this.getProperty("subtask")
        array.push(taskId);
        await this.setProperty({ "subtask": array })
    }
    async removeSubtask(taskId) {
        let array = this.getProperty("subtask")
        array = array.filter(e => e !== taskId);
        await this.setProperty({ "subtask": array })
    }
    getSubTasks() { return this.getProperty("subtask") }
    setParent(taskId) {
        return this.setProperty({ "parent": taskId });
    }
    getParent() { return this.getProperty("parent") }
    async initialize(isNewTask) {
        await super.initialize(isNewTask);
        if (isNewTask) {
            await this.setStatus(Task.NEW);
            await this.setType(Task.TASK);
            await this.setDate();
            await this.setProperty({ "available": false, "parent": null, "subtask": [] })
        }
    }
    getPreviewHtml() {
        let ret;
        let title = $("<span></span>").text(this.getTitle()).text();
        let description = $("<span></span>").text(this.getDescription()).text();
        if (!description || description.length === 0) {
            description = "説明文はありません"
        }
        let date = this.getDateText();
        let link = "t-" + this.getDocId();
        switch (this.getStatus()) {
            case Task.CANCELED:
                ret = `<div class="container my-1 card position-relative text-white bg-dark">
                            <div class="card-header">
                                廃止
                            </div>
                            <div class="card-body d-flex justify-content-between">
                                <div>
                                    <h5 class="card-title">
                                        ${title}
                                    </h5>
                                    <p class="card-text">${description}</p>
                                    <p class="card-text">${date}</p>
                                </div>
                                <button push="${link}" class="btn btn-outline-light stretched-link">詳細</button>
                            </div>
                        </div>`
                break;
            case Task.ON_HOLD:
                ret = `<div class="container my-1 card position-relative text-white bg-secondary">
                            <div class="card-header">
                                休止
                            </div>
                            <div class="card-body d-flex justify-content-between">
                                <div>
                                    <h5 class="card-title">
                                        ${title}
                                    </h5>
                                    <p class="card-text">${description}</p>
                                    <p class="card-text">${date}</p>
                                </div>
                                <button push="${link}" class="btn btn-outline-light stretched-link">詳細</button>
                            </div>
                        </div>`
                break;
            case Task.NEW:
                ret = `<div class="container my-1 card position-relative text-white bg-primary">
                            <div class="card-header">
                                新規
                            </div>
                            <div class="card-body d-flex justify-content-between">
                                <div>
                                    <h5 class="card-title">
                                        ${title}
                                    </h5>
                                    <p class="card-text">${description}</p>
                                    <p class="card-text">${date}</p>
                                </div>
                                <button push="${link}" class="btn btn-outline-light stretched-link">詳細</button>
                            </div>
                        </div>`
                break;
            case Task.IN_PROGRESS:
                ret = `<div class="container my-1 card position-relative text-white bg-warning">
                            <div class="card-header">
                                進行
                            </div>
                            <div class="card-body d-flex justify-content-between">
                                <div>
                                    <h5 class="card-title">
                                        ${title}
                                    </h5>
                                    <p class="card-text">${description}</p>
                                    <p class="card-text">${date}</p>
                                </div>
                                <button push="${link}" class="btn btn-outline-light stretched-link">詳細</button>
                            </div>
                        </div>`
                break;
            case Task.COMPLETED:
                ret = `<div class="container my-1 card position-relative text-white bg-success">
                            <div class="card-header">
                                完了
                            </div>
                            <div class="card-body d-flex justify-content-between">
                                <div>
                                    <h5 class="card-title">
                                        ${title}
                                    </h5>
                                    <p class="card-text">${description}</p>
                                    <p class="card-text">${date}</p>
                                </div>
                                <button push="${link}" class="btn btn-outline-light stretched-link">詳細</button>
                            </div>
                        </div>`
                break;
        }
        return ret;
    }
    async finishEditing() {
        await super.finishEditing();
        await this.setProperty({ "available": true })
    }
    async delete(fromParent = false) {
        let subtasks = this.getSubTasks();
        if (subtasks.length) {
            for (let i in subtasks) {
                let subtask = new Task(subtasks[i])
                await subtask.getInitPromise();
                await subtask.delete(true);
            }
        }
        if (!fromParent && this.getParent() != null) {
            let parent = new Task(this.getParent())
            await parent.getInitPromise();
            await parent.removeSubtask(this.getDocId());
        }
        await this.getDocumentRef().delete();
    }
    isAvailable() { return this.getProperty("available") }

    async getInitPromise() { return this._initPromise; }

    async setMeta(id, value) {
        if (!value) {
            value = firebase.firestore.FieldValue.delete()
        }
        let object = {};
        object["meta." + id] = value;
        await this.setProperty(object)
        this._properties.meta = (await this.getDocumentRef().get()).get("meta");
    }

    getMeta() {
        return this.getProperty("meta");
    }

    async setDate(timeUnit, year, month, day, hour, min, sec, ms) {
        let date = new Date();
        if (timeUnit === undefined) {
            await this.setProperty({ "date": date, "time-unit": Task.DAY });
            return;
        }
        date.setTime(0);
        switch (timeUnit) {
            case Task.MS:
                date.setMilliseconds(ms);
            case Task.SEC:
                date.setSeconds(sec);
            case Task.MIN:
                date.setMinutes(min);
            case Task.HOUR:
                date.setHours(hour);
            case Task.DAY:
                date.setDate(day);
            case Task.MONTH:
                date.setMonth(month);
            case Task.YEAR:
                date.setFullYear(year);
        }
        await this.setProperty({ "date": date, "time-unit": timeUnit });
    }

    getDate() {
        let date = this.getProperty("date")
        if (date) {
            let toDate = date.toDate;
            if (toDate) {
                return date.toDate();
            } else {
                return date;
            }
        }
    }

    getTimeUnit() { return this.getProperty("time-unit") }

    getDateText() {
        return DateTexter.convertDateToText(this.getDate(), this.getTimeUnit());
    }

    async setTitle(title) {
        await this.setProperty({ "title": title });
        await this.updateBiGram();
    }

    getTitle() { return this.getProperty("title") }

    async setDescription(description) {
        await this.setProperty({ "description": description });
        await this.updateBiGram();
    }

    getDescription() { return this.getProperty("description") }

    setStatus(status) { return this.setProperty({ "status": status }) }

    getStatus() { return this.getProperty("status") }

    setType(type) {
        return this.setProperty({ "type": type })
    }

    getType() { return this.getProperty("type") }

    updateBiGram() {
        let src = [];
        ["title", "description"].forEach(key => {
            let value = this.getProperty(key);
            if (value) {
                src.push(value);
            }
        })
        return this.setProperty({ "bi-gram": BiGram.createBiGramObjectFromTexts(src) })
    }
}

class Meta extends FirestoreDocument {
    static EXIST = 0;
    static ENUM = 1;
    static TYPE_TEXT = ["EXIST", "ENUM"];

    constructor(docId, noInitialize) {
        super(docId ?
            FirestoreUtils.userDocument.collection("custom-meta").doc(docId) :
            FirestoreUtils.userDocument.collection("custom-meta").doc());
        if (!noInitialize) this._initPromise = this.initialize(!docId);
    }
    getInitPromise() { return this._initPromise; }
    async setName(name) {
        if (!name || name.length < 2 || name.length > 40 || QueryUtils.isContainsBadChar(name)) {
            throw 'カスタムメタの名前が不正です'
        }
        let value = this.getProperty("value")
        let forBiGram = value ? Array.from(value) : [];
        forBiGram.push(name);
        await this.setProperty({
            "name": name,
            "bi-gram": BiGram.createBiGramObjectFromTexts(forBiGram)
        })
    }
    getName() { return this.getProperty("name"); }
    async setType(type) { await this.setProperty({ "type": type }); }

    getType() { return this.getProperty("type"); }
    getTypeName() { return Meta.TYPE_TEXT[this.getProperty("type")] }

    async setValue(values) {
        values.forEach(value => {
            if (!value || value.length < 2 || value.length > 40 || QueryUtils.isContainsBadChar(value)) {
                throw 'カスタムメタの名前が不正です'
            }
        });
        let forBiGram = Array.from(values);
        forBiGram.push(this.getProperty("name"));
        await this.setProperty({
            "value": values,
            "bi-gram": BiGram.createBiGramObjectFromTexts(forBiGram)
        })
    }

    getValue() { return this.getProperty("value"); }


    toString() { return this.getDocId() }
}