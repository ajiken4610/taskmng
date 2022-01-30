// このファイルはGUI関係のライブラリ

$(() => {
    // a要素で#が変更されたときに発火
    loadPage(location.hash);
    window.addEventListener("hashchange", () => {
        invalidatePage();
    }, false);

    // buttonとinput要素が押されたときに発火
    $(document).on("click", "button[href],input[href]", function() {
        history.pushState("", "", $(this).attr("href"));
        invalidatePage();
    });

    // 戻るボタンがクリックされたとき発火
    $(document).on("click", "#page-go-back", function() {
        escape();
    });

    // モーダルがどうこうしたときのイベント
    $("#default-modal").on("shown.bs.modal", () => {
        console.log("modal shown");
        console.log($("#default-modal").attr("class"));
    });
    $("#default-modal").on("hidden.bs.modal", () => {
        console.log("modal hidden");
        console.log($("#default-modal").attr("class"));
    });
});

// ログイン・ログアウト時に発火
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        showUserIcon(user.photoURL);
        activateActions();
        invalidatePage();
    } else {
        // User is signed out
        // ...
        hideUserIcon();
        deactivateActions();
    }
});

// ユーザーのアイコンを表示
function showUserIcon(url) {
    let imgElement = $("#nav-user-icon img");
    if (url === null) {
        imgElement.attr("src", "/icons/default-icon.png");
    } else {
        imgElement.attr("src", url);
    }
    $("#nav-login-button").hide();
    imgElement.ready(() => {
        $("#nav-user-icon").fadeIn();
    });
}

// ユーザーアイコンを非表示
function hideUserIcon() {
    $("#nav-user-icon").hide();
    $("#nav-login-button").show();
}

// アクションを有効化
function activateActions() {
    $("#navbarDropdown").show();
}

// アクションを無効化
function deactivateActions() {
    $("#navbarDropdown").hide();
}

// ページの#が書き変わったときに呼ぶ用
function invalidatePage() {
    loadPage(location.hash);
}

// ナビゲーションバーの下に表示するページを表示
function loadPage(hash) {
    hash = hash.substring(1);
    if (hash == "/app.html" || hash == "app.html" || hash.match("http.*")) {
        hash = "404.html";
    }
    if (hash == "") {
        hash = "frames/about.html";
    }
    url = hash;
    let frame = $("#page-frame");
    showOverlay();
    frame.fadeOut(250, () => {
        $.ajax(url, { datatype: "html" })
            .then(function(data) {
                frame.html(data);
                frame.fadeIn();
                hideOverlay();
            }, function(jqXHR, textStatus) {
                frame.html(jqXHR.responseText);
                frame.fadeIn(250);
                hideOverlay();
            });
    });
}

var overlayNest = 0;
// 読み込み中のやつを表示
function showOverlay() {
    overlayNest++;
    $(".full-overlay").fadeIn();
}

// 読み込み中のやつを非表示
function hideOverlay() {
    overlayNest--;
    if (overlayNest <= 0) {
        $(".full-overlay").fadeOut();
    }
}

// アカウントからログアウト
function signOut() {
    showDefaultModal({
        title: "ログアウト",
        body: "ログアウトしますか？",
        positiveText: "続行",
        negativeText: "キャンセル",
        onPositive: () => {
            if (firebase.auth().currentUser !== null) {
                firebase.auth().signOut();
            }
            invalidatePage();
        }
    });
}

// アカウントのパスワードをリセット
function sendPasswordResetEmali() {
    showDefaultModal({
        title: "パスワードリセットを以下のEメールに送信します",
        body: '<label for="modal-email">アドレス</label>\n<input type="email" class="form-control" id="modal-email" aria-describedby="emailHelp" value="' +
            firebase.auth().currentUser.email +
            '">',
        negativeText: "キャンセル",
        positiveText: "送信",
        onPositive: () => {
            let mail = $("#modal-email").attr("value")
            firebase.auth().sendPasswordResetEmail(mail)
                .then(() => {
                    showToast(mail + "にメールを送信しました");
                })
                .catch((error) => {
                    showToast("メールの送信に失敗しました");
                    console.log(error);
                })
        }
    });
}

// トーストを表示
function showToast(text) {
    $("#toast").toast("hide");
    $("#modal-toast").toast("hide");
    $("#toast-body").html(text)
    $("#modal-toast-body").html(text);
    $("#toast").toast("show");
    $("#modal-toast").toast("show");
}

// デフォルトのモーダルダイアログを表示
/*
option = {
    title:"",
    body:"",
    positiveText:"",
    negativeText:"",
    onPositive: funcRef,
    onNegative: funcRef,
}
*/
function showDefaultModal(
    modalOption = {
        title: undefined,
        body: undefined,
        bodyHtmlLink: undefined,
        positiveText: undefined,
        positiveButtonClass: "btn-primary",
        negativeText: undefined,
        negativeButonClass: "btn-secondary",
        onPositive: undefined,
        onNegative: undefined,
    }
) {
    // title
    if (modalOption.title) {
        $("#default-modal-header").show();
        $("#default-modal-title").html(modalOption.title);
    } else {
        $("#default-modal-header").hide();
    }

    // footer
    if (modalOption.positiveText) {
        $("#default-modal-button-positive")
            .show()
            .html(modalOption.positiveText)
            .off("click")
            .on("click", modalOption.onPositive)
    } else {
        $("#default-modal-button-positive").hide();
    }
    if (modalOption.positiveButtonClass) {
        $("#default-modal-button-positive")
            .removeClass()
            .addClass("btn")
            .addClass(modalOption.positiveButtonClass);
    } else {
        $("#default-modal-button-positive")
            .removeClass()
            .addClass("btn btn-primary");
    }

    if (modalOption.negativeText) {
        $("#default-modal-button-negative")
            .show()
            .html(modalOption.negativeText)
            .off("click")
            .on("click", modalOption.onNegative)
    } else {
        $("#default-modal-button-negative").hide();
    }
    if (modalOption.negativeButtonClass) {
        $("#default-modal-button-negative")
            .removeClass()
            .addClass("btn")
            .addClass(modalOption.negativeButtonClass);
    } else {
        $("#default-modal-button-negative")
            .removeClass()
            .addClass("btn btn-secondary");
    }
    if (modalOption.positiveText || modalOption.negativeText) {
        $("#default-modal-footer").show();
    } else {
        $("#default-modal-footer").hide();
    }

    let deferred = new $.Deferred;
    let overlayShowed = false;
    // body
    if (modalOption.bodyHtmlLink) {
        overlayShowed = true;
        showOverlay();

        $.ajax(modalOption.bodyHtmlLink, { datatype: "html" })
            .then(function(data) {
                let outHtml = $(data);
                if (modalOption.bodyHtmlId) {
                    $("#default-modal-body").html(outHtml.find("#" + modalOption.bodyHtmlId));
                } else {
                    $("#default-modal-body").html(outHtml);
                }
            }, function(jqXHR, textStatus) {
                $("#default-modal-body").html(jqXHR.responseText);
            }).always(() => {
                deferred.resolve();
            });
    } else {
        $("#default-modal-body").html(modalOption.body);
        deferred.resolve();
    }
    deferred.promise().done(() => {
        if (overlayShowed) {
            hideOverlay();
        }
        $("#default-modal").modal("show");
    });
}

// モーダルが開いてたら閉じる、開いてなかったら前のページへ。
function escape() {
    if ($("#default-modal").hasClass("show")) {
        $("#default-modal").modal("hide");
    } else {
        history.back();
    }
}

// 現在未使用
function setDynamicTtile(title = "") {
    let staticTitle = $("title").text();
    if (staticTitle.match(".* \\- ") !== null) {
        staticTitle = staticTitle.split(" - ")[0];
    }
    if (title.length === 0) {
        $("title").text(staticTitle);
    } else {
        $("title").text(staticTitle + " - " + title);
    }
}