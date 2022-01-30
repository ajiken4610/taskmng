// このファイルはシステム関係のライブラリ

// firebase analyticsの初期化
const analytics = firebase.analytics();

// firebase firestoreの初期化
const db = firebase.firestore();

// firease authのuidを保持
var uid;

// firestoreの自分のDocumentを保持
var userDocument;


// ログイン・ログアウト時に発火
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        uid = user.uid;
        initDatabase()
            .then(() => {
                console.log("Database initialize success.");
            })
            .catch((error) => {
                console.log("Database initialize fail.");
                console.log(error);
            });
    } else {
        uid = null;
        userDocument = null;
    }
});

// データーベースの初期化
async function initDatabase() {
    userQuerySnapshot = await db.collection("user")
        .where("uid", "==", uid)
        .limit(1)
        .get();
    if (userQuerySnapshot.size == 0) {
        userDocument = db.collection("user").doc();
        userDocument.set({
            "uid": uid,
            "name": firebase.auth().currentUser.displayName
        });
        console.log("User's database has been initialized.");
    } else {
        userDocument = userQuerySnapshot.docs[0].ref;
        console.log("User's database has already been initialized");
    }
}

// タスクの追加
async function addTask({

}) {

}

// カスタムメタの検索クエリ組み立て
function buildSearchQuery(text, map, query) {
    let biText = createBiGramArray(text);
    biText.forEach((bi) => {
        query = query.where(`${map}.${bi}`, "==", true);
    });
    return query;
}

// カスタムメタの追加
async function addCustomMeta(metaObject = {
    "type": "exist",
    "name": "NONE"
}) {
    let biGram = createBiGramObject(metaObject.name);
    let newCustomMetaDocument = userDocument.collection("custom-meta").doc();
    newCustomMetaDocument.set({
        "type": metaObject.type,
        "name": metaObject.name,
        "bi-gram": biGram
    });
}

// カスタムメタの名前変更
async function setCustomMetaName(oldName, newName) {
    let biGram = createBiGramObject(newName);
    let customMetaSnapshot = await userDocument.collection("custom-meta")
        .where("name", "==", oldName)
        .limit(1)
        .get();
    console.log(customMetaSnapshot);
    if (customMetaSnapshot.size == 0) {
        throw "Custom meta document was not found.";
    } else {
        customMetaSnapshot.forEach(async(documentSnapshot) => {
            await documentSnapshot.ref.update({
                "name": newName,
                "bi-gram": biGram
            });
        });
    }
}

// ビグラムをオブジェクトで作成
function createBiGramObject(text) {
    let returnObject = {};
    for (let i = 0; i < text.length - 1; i++) {
        returnObject[text.substring(i, i + 2)] = true;
    }
    return returnObject;
}

// ビグラムを配列で作成
function createBiGramArray(text) {
    let returnArray = [];
    for (let i = 0; i < text.length - 1; i++) {
        returnArray.push(text.substring(i, i + 2));
    }
    return returnArray;
}

function isContainsBadChar(text) {
    return text.match(".*\\..*") ||
        text.match(".*\\/.*") ||
        text.match(".*\\*.*") ||
        text.match(".*\\~.*") ||
        text.match(".*\\[.*") ||
        text.match(".*\\].*")
}