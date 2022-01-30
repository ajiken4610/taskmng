/**
 * このクラスは、URLに関する静的な機能を提供します。
 */
class URLUtilities {
    /**
     * URLを履歴に残さず書き換えます。
     * @param newURL {string} 書き換えるURL
     */
    static replace(newURL) {
        history.replaceState(null, "", newURL);
    }

    /**
     * URLを履歴を残して書き換えます。
     * @param newURL {string} 書き換えるURL
     */
    static push(newURL) {
        history.pushState(null, "", newURL);
    }

    /**
     * アドレスバーにあるURLを返します
     * @return {string} アドレスバーに存在するURL
     */
    static get() {
        return location.href;
    }

    /**
     * ページを再読み込みします。
     */
    static reload() {
        location.reload();
    }
}

/**
 * このクラスは、URLに関する実装を提供します。
 */
class URLSystem {
    /**
     * URL変更リスナーコールバック
     */
    static OnPageStateChangeListener = class {
        /**
         * onCreateが呼ばれたかどうか
         *
         */
        _createCalled = false;

        /**
         * ページ作成時に発火します
         * @param url {string} 作成されたURL
         */
        onCreate(url) {
            throw "Listener method must be overridden.";
        }

        /**
         * ページ破棄時に発火します
         * @param url {string} 破棄される時のURL
         */
        onDestroy(url) {
            throw "Listener method must be overridden.";
        }
    }

    /**
     * リスナー配列
     *
     * @static
     * @memberof URLSystem
     */
    static _onPageStateChangeListeners = [];

    /**
     * ページの状態変更リスナーを追加
     *
     * @static
     * @param {URLSystem.OnPageStateChangeListener} listener 追加するリスナー
     * @memberof URLSystem
     */
    static addOnPageStateChangeListener(listener) {
        this._onPageStateChangeListeners.push(listener);
        if (!listener._createCalled) {
            listener.onCreate(location.href);
        }
    }

    /**
     * ページの変更状態リスナーを削除
     *
     * @static
     * @param {URLSystem.OnPageStateChangeListener} listener 削除するリスナー
     * @memberof URLSystem
     */
    static deleteOnPageStateChangeListener(listener) {
        this._onPageStateChangeListeners = this._onPageStateChangeListeners.filter(item => item !== listener);
    }

    /**
     * リスナー登録
     */
    static staticInitialize() {

        // call onCreate
        let url = location.href;
        this._onPageStateChangeListeners.forEach(listener => {
            if (!listener._createCalled) {
                listener.onCreate(url);
                listener._createCalled = true;
            }
        });

        // call onDesoroy
        $(window).on('beforeunload', () => {
            this._onPageStateChangeListeners.forEach((listener) => {
                listener.onDestroy();
            });
        });
    }
}
URLSystem.staticInitialize();

/**
 *このクラスは、ハッシュ操作の静的メソッドを提供します。
 *
 * @class Hash
 */
class Hash {
    /**
     * ハッシュを履歴に残さずに書き換えます。
     *
     * @static
     * @param {string} newHash 書き換えるハッシュ
     * @memberof Hash
     */
    static replace(newHash) {
        history.replaceState(null, "", "#" + newHash);
        $(window).trigger("hashchange");
    }

    /**
     * ハッシュを履歴に残して書き換えます。
     *
     * @static
     * @param {string} newHash 書き換えるハッシュ
     * @memberof Hash
     */
    static push(newHash) {
        history.pushState(null, "", "#" + newHash);
        $(window).trigger("hashchange");
    }

    /**
     * アドレスバーに存在するハッシュを書き換えます。
     *
     * @static
     * @return {string} アドレスバーに存在するハッシュ 
     * @memberof Hash
     */
    static get() {
        return location.hash.substring(1);
    }

}

/**
 * このクラスは、URLのハッシュ部分に関する実装を提供します。
 *
 * @class HashSystem
 */
class HashSystem {
    /**
     * このインターフェースは、ハッシュ変更のリスナーでし。
     *
     * @static
     * @memberof HashSystem
     */
    static OnHashChangeListener = class {
        /**
         * ハッシュ変更時に発火します。
         *
         * @param {string} oldHash 変更前のハッシュ
         * @param {string} newHash 現在のハッシュ
         */
        onChange(oldHash, newHash) {
            throw "Listener method must be overridden.";
        }
    }

    /**
     * ハッシュ変更リスナーのリストです。
     *
     * @static
     * @memberof HashSystem
     */
    static _onHashChangeListeners = [];

    /**
     * ハッシュ変更リスナーを追加します。
     *
     * @static
     * @param {HashSystem.OnPageStateChangeListener} listener
     * @memberof HashSystem
     */
    static addOnHashChangeListener(listener) {
        this._onHashChangeListeners.push(listener);
    }

    /**
     *ハッシュ変更リスナーを削除します。
     * 指定されたリスナーが見つからなかった場合、無視されます。
     *
     * @static
     * @param {HashSystem.OnPageStateChangeListener} listener
     * @memberof HashSystem
     */
    static deleteOnHashChangeListener(listener) {
        this._onHashChangeListeners = this._onHashChangeListeners.filter(item => item !== listener);
    }

    /**
     * リスナーに渡す用の変更前のハッシュ
     *
     * @static
     * @memberof HashSystem
     */
    static _oldHash = "";

    static staticInitialize() {
        $(window).on("hashchange", () => {
            let newHash = location.hash.substring(1);
            this._onHashChangeListeners.forEach(listener => {
                listener.onChange(this._oldHash, newHash);
            });
            this._oldHash = newHash;
        });

        URLSystem.addOnPageStateChangeListener(new class extends URLSystem.OnPageStateChangeListener {

            /**
             * ページ作成時に発火します
             * @param url {string} 作成されたURL
             */
            onCreate(url) {
                // HashSystem._oldHash = location.hash.substring(1);
            }

            /**
             * ページ破棄時に発火します
             * @param url {string} 破棄される時のURL
             */
            onDestroy(url) {
                // do nothing ?
            }
        });
    }
}
HashSystem.staticInitialize();

/**
 * ページの状態保存に使用します。
 * 状態は決して暗号化されませんので、ユーザーに関する情報を格納しないでください。
 *
 * @class State
 */
class State {

    /**
     * Stateクラスのインスタンスをテキストから生成します。
     * このコンストラクタは、convertToTextメソッドと互換性があります。
     * 
     * 
     * @param {string} text 変換して格納するテキスト。JSON形式で記述される必要がある。
     * @memberof State
     */
    constructor(text = null) {
        try {
            if (text) {
                this.state = decodeURIComponent(text);
            } else {
                this.state = null;
            }
        } catch (e) {
            console.error(e);
            this.state = null;
        }
    }

    /**
     * 状態を表します。
     *
     * @memberof State
     */
    state;

    /**
     * インスタンスを復元可能なテキストに変換します。
     * インスタンスを復元する場合は、コンストラクタの引数に、このメソッドの戻り値を入れてください。
     *
     * @return {string} コンストラクタと互換性のあるテキスト。 
     * @memberof State
     */
    convertToText() {
        if (this.state) {
            return encodeURIComponent(this.state);
        } else {
            return null;
        }
    }
}

/**
 * インナーのページに関するコールバックシステムを提供します。
 * このクラスは複数のインスタンスを同時に使えるように設計されていません。
 *
 * @class LevelPageSystem
 */
class LevelPageSystem {
    /**
     * インナーのページを表すクラスです。
     *
     * @class LevelPageSystem.Callback
     */
    static Callback = class {

        /**
         * インナーのページ作成時に呼ばれます。
         * @param index 作成されたページのインデックス
         * @param name 作成されたページの名前
         * @memberof LevelPageSystem.Callback
         */
        onCreate(index, name) {
            throw "Call method must be overridden.";
        }

        /**
         * インナーのページ破棄時に呼ばれます。
         * @param index
         * @memberof LevelPageSystem.Callback
         */
        onDestroy() {
            throw "Call method must be overridden.";
        }

        /**
         * インナーのページの状態が外部から変更されたときに呼ばれます。
         * @param index
         * @memberof LevelPageSystem.Callback
         */
        onChangeState(oldState, newState) {
            throw "Call method must be overridden.";
        }
    }

    /**
     * LevelPageSystemはnewできません。
     * @memberof LevelPageSystem
     */
    constructor() {
        throw "This class cannot be instanced";
    }

    /**
     * このクラスが管理しているLevelPageSystem.Callbackのインスタンスを保持します。
     *
     * @static
     * @memberof LevelPageSystem
     */
    static _levelPages = [];

    /**
     * レベルページコールバックを追加します。
     *
     * @static
     * @param {LevelPageSystem.Callback} levelPage 追加するコールバック
     * @memberof LevelPageSystem
     */
    static addCallback(levelPage) {
        this._levelPages.push(levelPage);
    }

    /**
     * レベルページコールバックを削除します。
     *
     * @static
     * @param {LevelPageSystem.Callback} levelPage 削除するコールバック
     * @memberof LevelPageSystem
     */
    static deleteCallback(levelPage) {
        this._levelPages = _levelPages.filter(item => item !== levelPage);
    }

    static staticInitialize() {
        // HashSystemのコールバック受け取る
        let listener = new class extends HashSystem.OnHashChangeListener {
            /**
             * ハッシュ変更時に、何が変わったのかを検知してコールバックを呼び出します。
             *
             * @param {string} oldHash 変更前のハッシュ
             * @param {string} newHash 現在のハッシュ
             */
            onChange(oldHash, newHash) {
                // console.log("PAGE : \"" + oldHash + "\" --> \"" + newHash + "\"");
                let splitedOld = oldHash.split("/");
                let splitedNew = newHash.split("/");
                for (let i = 0; i < Math.max(splitedOld.length, splitedNew.length); i++) {
                    let currentNew = splitedNew[i];
                    let currentOld = splitedOld[i];
                    // LevelPageSystem._levelPages
                    if (!currentOld && currentNew) {
                        // 新しいページが追加された
                        LevelPageSystem._levelPages.forEach(callback => {
                            callback.onCreate(i, currentNew)
                        });
                    } else if (!currentNew && currentOld) {
                        // ページが削除された
                        LevelPageSystem._levelPages.forEach(callback => {
                            callback.onDestroy(i);
                        });
                    } else if (currentNew !== currentOld && currentNew && currentOld) {
                        // ページの状態が変更された
                        LevelPageSystem._levelPages.forEach(callback => {
                            callback.onChangeState(i, currentOld, currentNew);
                        });
                    }
                }
            }
        }

        HashSystem.addOnHashChangeListener(listener);
        /*LevelPageSystem.addCallback(new class extends LevelPageSystem.Callback {
                    onCreate(index, name) {
                        console.log("onCreate was called : " + index + " , \"" + name + "\"");
                    }
                    onDestroy(index) {
                        console.log("onDestroy was called : " + index);
                    }
                    onChangeState(index, oldState, newState) {
                        console.log("onChangeState was called : " + index + " , \"" + oldState + "\" --> \"" + newState + "\"");
                    }
                });*/
    }
}
LevelPageSystem.staticInitialize();

class Fragment {

    // public ::
    onCreate() {}
    onViewCreated(view) {}
    onResume() {}
    onChangeState(oldState, newState) {}
    onPause() {}
    onDestroy() {}
    onSaveState(state) {}

    // final
    invalidateHash() {
        this._manager.invalidateHash();
    }

    escape() {
        this._manager.pop();
    }

    push(fragmentName) {
        this._manager.push(fragmentName);
    }

    replace(fragmentName) {
        this._manager.replace(fragmentName);
    }

    showOverlay() {
        this._manager.showOverlay();
    }

    hideOverlay() {
        this._manager.hideOverlay();
    }

    // package private ::
    _manager;
    _view;
    onStartManagement(manager) {
        this._manager = manager;
    }
}

class FragmentFactory {
    newFragment(fragmentName) {
        throw "Factory method must be implemented.";
    }
    getFragmentName(fragment) {
        throw "Factory method must be implemented.";
    }
}

class FragmentManager extends LevelPageSystem.Callback {
    _fragments = [];
    _fragmentFactory;
    _view;
    _overlay;
    _sync = new Synchronizer();

    constructor(view, fragmentFactory) {
        super();
        this._view = view;
        this._overlay = $('<div class="full-overlay"></div>');
        this._overlay.appendTo(view);
        this._fragmentFactory = fragmentFactory;

        LevelPageSystem.addCallback(this);
        $(window).trigger("hashchange");
    }

    _shownOverlay = 0;
    showOverlay() {
        this._shownOverlay++;
        // this._overlay.fadeIn();
        this._overlay.addClass('shown');
    }

    hideOverlay() {
        if (0 >= --this._shownOverlay) {
            // this._overlay.fadeOut();
            this._overlay.removeClass('shown');
        }
    }

    replace(fragmentName) {
        let splitedHash = FragmentManager._getSplitedHash();
        splitedHash.pop();
        splitedHash.push(fragmentName);
        Hash.push(splitedHash.join("/"));
    }


    push(fragmentName) {
        let splitedHash = FragmentManager._getSplitedHash();
        splitedHash.push(fragmentName);
        Hash.push(splitedHash.join("/"));
    }

    pop() {
        let splitedHash = FragmentManager._getSplitedHash();
        splitedHash.pop();
        Hash.push(splitedHash.join("/"));
    }

    static _getSplitedHash() {
        let splitedHash = Hash.get().split("/");
        splitedHash = splitedHash.filter(element => element);
        return splitedHash;
    }

    invalidateHash() {
        let ret = "";
        this._fragments.forEach(fragment => {
            if (fragment) {
                ret += this._fragmentFactory.getFragmentName(fragment);
                let state = new State();
                fragment.onSaveState(state);
                let stateText = state.convertToText();
                if (stateText) {
                    ret += "-";
                    ret += stateText;
                }
                ret += "/";
            }
        });
        ret = ret.substring(0, ret.length - 1);
        Hash.push(ret);
    }

    invalidateFragments() {
        let originalHash = Hash.get();
        Hash.replace("");
        Hash.replace(originalHash);
    }

    async onCreate(index, name) {
        this.showOverlay();

        await this._sync.synchronized(async() => {
            let splitedName = name.split("-");
            let fragmentName = splitedName.splice(0, 1)[0];
            let fragmentState = splitedName.join("-");
            let currentFragment = this._fragments[index];
            if (this._fragments[index - 1]) {
                this._fragments[index - 1].onPause();
            }
            if (!currentFragment || this._fragmentFactory.getFragmentName(currentFragment) !== fragmentName) {
                // ほかから作られたときは、まだ配列に追加されていない
                this._fragments[index] = this._fragmentFactory.newFragment(fragmentName);

            }
            this._fragments[index].onStartManagement(this);
            await this._fragments[index].onCreate();
            // ビューの作成
            let view = $('<div class="fragment"></div>');
            this._fragments[index]._view = view;
            view.appendTo(this._view);
            await this._fragments[index].onViewCreated(view);
            await this._fragments[index].onChangeState(new State(), new State(fragmentState));
            await this._fragments[index].onResume();
            await Sleeper.sleep(50);
            view.addClass('shown');
        });

        this.hideOverlay();
    }

    async onDestroy(index) {
        this.showOverlay();

        await this._sync.synchronized(async() => {
            // 残ってたら、onDestroyを読んでさよなら
            if (this._fragments[index]) {
                await this._fragments[index].onPause();
                await this._fragments[index]._view.removeClass("shown");

                // アニメーション終わるの待ち
                await Sleeper.sleep(500);

                await this._fragments[index]._view.remove();
                await this._fragments[index].onDestroy();
                this._fragments[index] = null;

            }
            if (this._fragments[index - 1]) {
                await this._fragments[index - 1].onResume();
            }
        });

        this.hideOverlay();
    }

    async onChangeState(index, oldName, newName) {
        // とりあえず、分けておく
        let splitedOld = oldName.split("-");
        let fragmentOldName = splitedOld.splice(0, 1)[0];
        let fragmentOldState = splitedOld.join("-");
        let splitedNew = newName.split("-");
        let fragmentNewName = splitedNew.splice(0, 1)[0];
        let fragmentNewState = splitedNew.join("-");

        let currentFragment = this._fragments[index];

        if (currentFragment && this._fragmentFactory.getFragmentName(currentFragment) === fragmentNewName) {
            // フラグメントがすでに生成されていた場合
            await currentFragment.onChangeState(new State(fragmentOldState), new State(fragmentNewState));
        } else {
            // フラグメントごと取り換えられていた場合
            if (currentFragment) {
                this.onDestroy(index);
                this.onCreate(index, newName);
            }
        }

    }
}

class AjaxFragment extends Fragment {
    _url;
    constructor(ajaxURL) {
        super();
        this._url = ajaxURL;
    }

    onViewCreated(view) {
        let deferred = new $.Deferred();
        view.load(this._url, (response, status) => {
            if (status !== "success") {
                view.html(response);
            }
            deferred.resolve();
        });
        return deferred.promise();
    }
}

class ToastUtils {
    static showToast(message) {
        $("#toast").toast("hide");
        $("#toast-body").html(message);
        $("#toast").toast("show");
    }
}