// synchronizeブロックを使用するためのロジックが入ってるクラス
class Synchronizer {
    _tasks = [];

    async synchronized(func) {
        if (this._tasks.length > 0) {
            let promise =
                (async function(synchronizer) {
                    await synchronizer._tasks[synchronizer._tasks.length - 1];
                    await func();
                    synchronizer._tasks = synchronizer._tasks.filter(task => task !== promise);
                })(this);
            /*new Promise(resolve => {
                new Promise(innerResolve => innerResolve())
                    .then(() => this._tasks[this._tasks.length - 1])
                    .then(() => {
                        console.log("func called")
                        return func();
                    }).then(() => {
                        this._tasks = this._tasks.filter(task => task !== promise);
                        resolve();
                        console.log("resolve called")
                    });
            })*/
            this._tasks.push(promise);
            //console.log("waiting")
            await promise;
            //console.log("waited")
        } else {
            let promise = func();
            this._tasks.push(promise);
            await promise;
            this._tasks = this._tasks.filter(task => task !== promise);
        }
    }
}

// awaitでスリープを実現するクラス。synchronizerのお供に使うといい感じ
class Sleeper {
    static sleep(ms, callback) {
        let promise = new Promise(resolve => setTimeout(resolve, ms))
        promise.then(() => { if (callback) callback; });
        return promise;
    }
}

// BiGramに分割したりするクラス。別に特筆することはない
class BiGram {

    static splitBy(text, separators) {
        for (let i = 1; i < text.length; i++) {
            text = text.replace(separators[i], separators[0]);
        }
        return text.split(separators[0]);
    }

    // ビグラムをオブジェクトで作成
    static createBiGramObject(text, separators) {
        if (separators) {
            return this.createBiGramObjectFromTexts(this.splitBy(text, separators));
        } else {
            let returnObject = {};
            for (let i = 0; i < text.length - 1; i++) {
                returnObject[text.substring(i, i + 2)] = true;
            }
            return returnObject;
        }
    }

    // ビグラムを配列で作成
    static createBiGramArray(text, separators) {
        return Object.keys(this.createBiGramObject(text, separators));
    }

    static createBiGramObjectFromTexts(array, separators) {
        let returnObject = {};
        if (separators) {
            array.forEach(text => {
                console.log(text);
                Object.assign(returnObject, this.createBiGramObjectFromTexts(this.splitBy(text, separators)));
            });
        } else {
            array.forEach(text => {
                Object.assign(returnObject, this.createBiGramObject(text));
            })
        }
        return returnObject;
    }

    static createBiGramArrayFromTexts(array, separators) {
        return Object.keys(this.createBiGramObjectFromTexts(array, separators));
    }
}

class DateTexter {
    static MS = 0;
    static SEC = 1;
    static MIN = 2;
    static HOUR = 3;
    static DAY = 4;
    static MONTH = 5;
    static YEAR = 6;

    static TIME_UNIT = ["ミリ秒", "秒", "分", "時", "日", "月", "年"];

    static convertDateToText(date, timeUnit) {
        if (date) {
            let now = new Date();
            let sub = DateTexter.YEAR + 1;
            if (date.getFullYear() === now.getFullYear()) {
                sub = DateTexter.YEAR;
                if (date.getMonth() === now.getMonth()) {
                    sub = DateTexter.MONTH;
                    if (date.getDate() === now.getDate()) {
                        sub = DateTexter.DAY;
                    }
                }
            }
            let unit = timeUnit;
            let text = "";
            switch (unit) {
                case DateTexter.MS:
                    text = date.getMilliseconds() + DateTexter.TIME_UNIT[DateTexter.MS];
                case DateTexter.SEC:
                    text = date.getSeconds() + DateTexter.TIME_UNIT[DateTexter.SEC] + text;
                case DateTexter.MIN:
                    text = date.getMinutes() + DateTexter.TIME_UNIT[DateTexter.MIN] + text;
                case DateTexter.HOUR:
                    text = date.getHours() + DateTexter.TIME_UNIT[DateTexter.HOUR] + text;
                case DateTexter.DAY:
                    if (sub > DateTexter.DAY) text = date.getDate() + DateTexter.TIME_UNIT[DateTexter.DAY] + text
                    else if (text.length == 0) text = "今日中"
                    else text = "本日 " + text
                case DateTexter.MONTH:
                    if (sub > DateTexter.MONTH) text = date.getMonth() + 1 + DateTexter.TIME_UNIT[DateTexter.MONTH] + text
                    else if (text.length == 0) text = "今月中"
                case DateTexter.YEAR:
                    if (sub > DateTexter.YEAR) text = date.getFullYear() + DateTexter.TIME_UNIT[DateTexter.YEAR] + text
                    else if (text.length == 0) text = "今年中"

            }
            return text;
        }
    }
}