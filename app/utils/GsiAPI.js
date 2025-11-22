/**
 * キーワードから、そのキーワードを含む土地情報を取得する関数(ジオコーディング)
 * 戻り値はgeoJSONの形式
 * 使用するAPIの詳細は以下を参照
 * https://github.com/gsi-cyberjapan/gsimaps
 * @param {string} query - 検索欄に入力されたキーワード
 * @returns {geoJSON | null} - キーワードに該当する候補のFeatureCollections
 */
export async function GetRegion(query) {
    if (!query) {
        return;
    }
    const GEOCODE_URL_BASE = "https://msearch.gsi.go.jp/address-search/AddressSearch";
    const que_url = GEOCODE_URL_BASE + "?q=" + encodeURIComponent(query);
    try{
        const response = await fetch(que_url);
        if (!response.ok) {
            throw new Error('ジオコーディングエラー');
        }
        const data = await response.json();
        return data;
    } catch(error) {
        console.error("候補取得エラー", error);
        return null;
    }
}




/**
 * 標高を取得する関数 
 * 使用するAPIの詳細は以下を参照
 * https://maps.gsi.go.jp/development/elevation_s.html
 * @param {number[]} location - 標高を得たい場所の座標。[lng, lat](geoJSONの順)
 * @returns {number | null} - 標高[m]
 */
export async function GetElevation(location) {
    const ELEVATION_URL_BASE = "https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php";
    const que_url = `${ELEVATION_URL_BASE}?lon=${location[0]}&lat=${location[1]}&outtype=JSON`;
    // console.log(que_url);
    try{
        const response = await fetch(que_url);
        if (!response.ok) {
            throw new Error('標高取得エラー');
        }
        const data = await response.json();
        if (data.elevation === null) {
            throw new Error('指定座標の標高データが取得できませんでした');
        }
        return data.elevation;
    } catch(error) {
        console.error("標高取得エラー:", error);
        return null;
    }
}




/**
 * 位置情報から住所を住所を取得する関数(逆ジオコーディング)
 * 使用するAPIの詳細は以下を参照
 * https://github.com/gsi-cyberjapan/gsimaps
 * https://qiita.com/kosei_KB/items/5668bc6522ebe866f291
 * この関数を使うにはHTMLでmuni.jsを実行し、グローバル変数GSI.MUNI_ARRAYが定義されていないといけない
 * @typedef {Object} AddReturn
 * @property {string} muniCd - 次の変換表に対応するコードhttps://maps.gsi.go.jp/js/muni.js
 * @property {string} lv01Nm - 地名
 * @property {string} pref - 都道府県名
 * @property {string} muni - 市区町村名
 * 
 * @param {number[]} location - 住所を得たい場所の座標。[lng, lat](geoJSONの順)
 * @returns {AddReturn}
 */
export async function GetAddress(location) {
    const INV_GEOCODE_URL_BASE = "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress";
    const que_url = `${INV_GEOCODE_URL_BASE}?lat=${location[1]}&lon=${location[0]}`;
    // console.log(que_url);
    try {
        const response = await fetch(que_url);
        if (!response.ok) {
            throw new Error('逆ジオコーディングエラー');
        }
        const data = await response.json();
        if (Object.keys(data).length === 0) {
            throw new Error('指定座標の住所データが取得できませんでした');
        }
        const data_result = data.results;
        // 市町村コードを解析する
        const muni_results = municode2Adress(data_result.muniCd);
        if (!muni_results) {
            data_result.pref = null;
            data_result.muni = null;
        } else {
            data_result.pref = muni_results[0];
            data_result.muni = muni_results[1];
        }
        return data_result;
    } catch(error) {
        console.error("逆ジオコーディングエラー");
        return null;
    }
}




/**
 * 市町村コード(4 or 5桁)からグローバル変数GSI.MUNI_ARRAYに記述される住所情報を取得する関数
 * @param {string} muni_code - 住所検索APIで取得された市町村コード(例："13103"") 
 * @returns {string[] | null} - [都道府県名, 市区町村名]の住所文字列
 */
function municode2Adress(muni_code) {
    if (!muni_code || typeof muni_code !== 'string') {
        console.error("無効な市町村コードです。");
        return null;
    }
    if (!Object.hasOwn(GSI.MUNI_ARRAY, muni_code)) {
        console.error("登録されていない市町村コードです。");
        return null;
    }
    // await waitForMuniArray();
    // 該当するcsv文字列の取得
    const csv_string = GSI.MUNI_ARRAY[muni_code];
    const parts = csv_string.split(',');
    return [parts[1], parts[3]];
}




/**
 * muni.jsで定義されるグローバル変数であるGSI.MUNI_ARRAYがロードされているかを検証する関数
 * HTMLでdeferタグをつけているので通常はこれを使わなくても大丈夫なはず
 */
function waitForMuniArray() {
    return new Promise(resolve => {
        if (typeof window.GSI !== 'undefined' && window.GSI.MUNI_ARRAY) {
            resolve();
            return;
        }
        const checkInterval = setInterval(() => {
            if (typeof window.GSI !== 'undefined' && window.GSI.MUNI_ARRAY) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 50); // 50ミリ秒ごとにチェック
    });
}