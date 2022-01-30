// ライブラリの読み込み

// insert_link("script", { src: "/__/firebase/8.6.8/firebase-app.js" }, "/__/firebase/8.6.8/firebase-app.js");

var my_css = {
    href: "/css/style.css",
    rel: "stylesheet"
};
await insert_link("link", my_css, my_css.href);

var bootstrap_css = {
    rel: "stylesheet",
    integrity: "sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1",
    crossOrigin: "anonymous",
    href: "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/css/bootstrap.min.css"
};
insert_link("link", bootstrap_css, bootstrap_css.href);

var jQuery_js = {
    src: "https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"
};
insert_link("script", jQuery_js, jQuery_js.src);

var bootstrap_js = {
    src: "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/js/bootstrap.bundle.min.js",
    integrity: "sha384-ygbV9kiqUc6oa4msXn9868pTtWMgiQaeYH7/t7LECLbyPA2x65Kgf80OJFdroafW",
    crossOrigin: "anonymous"
};
insert_link("script", bootstrap_js, bootstrap_js.src);

var lato_font = {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css?family=Lato"
};
insert_link("link", lato_font, lato_font.href);

insert_link("script", { src: "/__/firebase/8.6.8/firebase-analytics.js" }, "/__/firebase/8.6.8/firebase-analytics.js");
insert_link("script", { src: "/__/firebase/8.6.5/firebase-firestore.js" }, "/__/firebase/8.6.5/firebase-firestore.js");
insert_link("script", { src: "/__/firebase/init.js" }, "/__/firebase/init.js");



async function insert_link(tagname, obj, raw_url) {
    // 差し込む要素の生成
    var target_tag = document.createElement(tagname);
    var keylist = Object.keys(obj);
    var currentkey;
    for (let int = 0; int < keylist.length; int++) {
        currentkey = keylist[int];
        target_tag[currentkey] = obj[currentkey];
    }

    // その要素がhead内にすでに存在するかどうかチェックし、存在しない場合のみ読み込みを行う
    var head = document.querySelector('head');
    var headtext = head.innerHTML;
    var processed_url = raw_url.replace(/\//g, '\\/');
    processed_url = processed_url.replace(/\./g, '\\.');
    var regexstr = new RegExp('=["\']' + processed_url + '["\']', 'g');
    if (!regexstr.test(headtext)) {
        head.appendChild(target_tag);
    }
    return target_tag;
}



function loadPage(url) {
    $.ajax(url, { datatype: "html" })
        .then(function (data) {
            var outHtml = $($.parseHTML(data));
            $("#page-body").html(outHtml.filter("#page-body")[0].innerHtml);
        }
            , function (jqXHR, textStatus) {
                console.log(textStatus);
            });
}