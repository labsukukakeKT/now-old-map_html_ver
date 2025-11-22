import { GetAddress, GetElevation, GetRegion } from "./GsiAPI.js";

let current_marker_layer = null;

export default function setSearch(map) {
    const form = document.getElementById("search-form");
    const input = document.getElementById("search-input");
    const sgst_list = document.getElementById("suggestions");


    form.addEventListener('submit', async function(event) {
        // ページ遷移を行わない
        event.preventDefault();

        // 検索キーワードの取得
        const query = input.value;
        const sgst_obj = await GetRegion(query);
        if (!sgst_obj) {
            clearSuggests(sgst_list);
        } else {
            dispSuggests(sgst_obj, sgst_list, map);
        }
    });


    // ユーザーが入力欄以外をクリックしたらリストを非表示にする
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.autocomplete-container')) {
            clearSuggests(sgst_list);
        }
    });
}


/**
 * 候補リストをクリアする関数
 */
function clearSuggests(sgst_list) {
    sgst_list.innerHTML = '';
}


/**
 * 候補リストを表示する関数
 */
async function dispSuggests(suggestions, sgst_list, map) {
    clearSuggests(sgst_list);
    if (suggestions.length === 0) {
        return;
    }

    for (let i = 0; i < suggestions.length; i++) {
        let item = suggestions[i];
        // 住所情報の検索
        const muni_obj = await GetAddress(item.geometry.coordinates);

        const li = document.createElement('li');
        const title_span = document.createElement('span');
        title_span.textContent = item.properties.title;
        li.appendChild(title_span);
        const detail = document.createElement('small');
        detail.textContent = muni_obj.pref + muni_obj.muni;
        li.appendChild(document.createElement('br'));
        li.appendChild(detail);


        // 候補がクリックされたときの処理
        li.addEventListener('click', async function(event) {
            // result_area.textContent = JSON.stringify(item);
            // 標高の取得
            const elev = await GetElevation(item.geometry.coordinates);
            item.properties.elev = elev;
            item.properties.pref = muni_obj.pref;
            item.properties.muni = muni_obj.muni;
            // const temp1 = `名前：${item.properties.title}\n`;
            // const temp2 = `緯度：${item.geometry.coordinates[1]}°\n経度：${item.geometry.coordinates[0]}°\n`;
            // const temp3 = `標高：${elev} m\n`;
            // const temp4 = `都道府県：${numi_obj.pref}\n`;
            // const temp5 = `市区町村：${numi_obj.muni}`
            // result_area.textContent = temp1 + temp2 + temp3 + temp4 + temp5;
            const new_layer = setMarker(map, item, current_marker_layer);
            new_layer.openPopup();
            current_marker_layer = new_layer;
            clearSuggests(sgst_list);
        });
        sgst_list.appendChild(li);
    }
}


/**
 * leafletにマーカーのレイヤーを作成し、そこに移動する関数
 * leafletのsetViewの引数は緯度経度が逆なので注意
 * @param {L.map} map - leafletのインスタンス
 * @param {Object} geo_json - geoJSON形式で、単一の地点が格納された構造体
 * @param {L.LayerGroup | null} old_layer - 削除する既存のマーカーレイヤー
 * @returns {L.LayerGroup} - 新しいマーカーレイヤー
 */
function setMarker(map, geo_json, old_layer) {
    if (old_layer) {
        map.removeLayer(old_layer);
    }

    let marker_layer = L.geoJSON(geo_json, {
        pointToLayer: function (feature, latlng) {
            // L.AwesomeMarkers.icon() でカスタムアイコンを定義
            var redMarker = L.AwesomeMarkers.icon({
                icon: 'info-sign', // アイコンとして表示するFont Awesomeのクラス名（例）
                prefix: 'glyphicon', // 使用するアイコンライブラリ（Font Awesome, glyphiconなど）
                markerColor: 'green' // ここで色を指定
            });
            
            // 定義したアイコンを使ってマーカーを生成
            return L.marker(latlng, {icon: redMarker});
        },
        onEachFeature: function (feature, layer) {
            if (feature.properties && feature.properties.title) {
                const text = `<b>${feature.properties.title}</b><br>都道府県：${feature.properties.pref}<br>市区町村：${feature.properties.muni}<br>標高：${feature.properties.elev} m`;
                layer.bindPopup(text);
                layer.openPopup({autoClose: false});
            }
        }
    });

    marker_layer.addTo(map);
    const lat = geo_json.geometry.coordinates[1];
    const lng = geo_json.geometry.coordinates[0];
    map.setView([lat, lng], 15);

    return marker_layer;
}
