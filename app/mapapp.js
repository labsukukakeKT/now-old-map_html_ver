import FileNames from "./filenames.js";
import TileLoader from "./utils/tileloader.js";
import Spots from "./utils/spots.js";
import setSlider from "./utils/slider.js";

// HTMLが完全に読み込まれた後にコードを実行する
document.addEventListener('DOMContentLoaded', main);

async function main() {
    // TileLoaderの設定
    const json_files = [FileNames.TOPO_JSON, FileNames.PHOTO_JSON, FileNames.KJMAP_JSON, FileNames.GSI_STD_JSON];
    let tile_loader = new TileLoader(json_files);

    // ロードが完了するまでawaitで待機する
    try {
        for (let i = 0; i < tile_loader.data_promise.length; i++) {
            await tile_loader.data_promise[i];
        }
        tile_loader.constructor2();
    } catch(error) {
        console.error("データロード中にエラーが発生しました:", error);
    }

    


    // 地図の設定
    // baseLayerとtileLayerの二種類のレイヤーを用意する
    // 年代別の地図はtileLayerで実装し、拝啓としてbaseLayerを使う
    const init_poinit = [35.5117, 139.4754]; // すずかけ台
    let map = L.map('map').setView(init_poinit, 15); // 最初の表示場所とズームレベル
    let current_map_url = tile_loader.topo_tile[0].url;
    let baseLayer = L.tileLayer("").addTo(map);
    let tileLayer = L.tileLayer(current_map_url, {
        // 著作権表示（必須）
        attribution: '出典: <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>, <a href="https://ktgis.net/kjmapw/tilemapservice.html" target="_blank">今昔マップ on the web</a>',
        maxZoom: 18 // 最大ズームレベル
    }).addTo(map);
    map.on('dragend', MapChanged);




    // 現在表示している地図のラベル表示の設定
    let map_label = document.getElementById('current-map');
    map_label.textContent = tile_loader.topo_tile[0].data_set;
    let era_label = document.getElementById('current-era');
    era_label.textContent = "最新の地図";




    // 背景レイヤーの種類の選択
    const base_selector = document.getElementById('base-selector');
    for (let i = 0; i < 3; i++) {
        let option = document.createElement('option');
        option.textContent = tile_loader.std_tile[i].data_set;
        option.value = i;
        base_selector.appendChild(option);
    }
    base_selector.addEventListener('change', function(event) {
        const id = event.target.value;
        const url = tile_loader.std_tile[id].url;
        baseLayer.setUrl(url);
    });




    // 透明度スライダーの設定
    const a_slider = document.getElementById('alpha-slider');
    const a_sld_label = document.getElementById('alpha-slider-label'); 
    a_sld_label.textContent = a_slider.value;
    a_slider.addEventListener('change', function(event) {
        const val = event.target.value;
        a_sld_label.textContent = val;
        tileLayer.setOpacity(val);
    });




    // 年代スライダーの設定
    let slider = document.getElementById('era-slider');
    setSlider(slider);
    slider.noUiSlider.on('change', MapChanged);



 
    // 地形図と航空写真の切り替えボタンの設定
    const button = document.querySelector('.map-toggle-button');
    button.addEventListener('click', () => {
        // 現在の状態によってクラスとテキストを切り替える
        // console.log('押された')
        if (button.classList.contains('map-view')) {
            button.classList.remove('map-view');
            button.classList.add('satellite-view');
            button.querySelector('span').textContent = '地形図に切り替え';
            // 実際の地図の切り替え処理...
            MapChanged();
        } else {
            button.classList.remove('satellite-view');
            button.classList.add('map-view');
            button.querySelector('span').textContent = '航空写真に切り替え';
            // 実際の地図の切り替え処理...
            MapChanged();
        }
    });
    // ボタンに付随するアイコンの設定
    const button_img = document.getElementById("map-toggle-button-icon");
    button_img.src = FileNames.MAP_PHOTO_ICON;




    // 複数のピンを同時に設定
    // 地図をズームアウトしたときに重くならないように、マーカークラスターを使う
    const marker_group = L.markerClusterGroup();
    const markerData = Spots.spots;
    markerData.forEach(data =>  {
        // バッククォーテーションであることに注意：`
        const marker = L.marker([data.lat, data.lng]).bindPopup(`<b>${data.name}</b><br>${data.abst}`);
        
        // マーカーにカーソルを合わせたときにポップアップを開く
        marker.on('mouseover', function(e) {
            this.openPopup();
        });
        marker.on('mouseout', function(e) {
            this.closePopup();
        });

        // マーカーをクリックしたときに詳細を表示
        marker.on('click', function(e) {
            document.getElementById("spot-title").textContent = data.name;
            document.getElementById("spot-abst").textContent = data.abst;
            document.getElementById("spot-detail").textContent = data.detail;
        })

        marker_group.addLayer(marker);
    });
    map.addLayer(marker_group);




    // ピンの表示・非表示の設定
    const pin_checkbox = document.getElementById('show-pins');
    pin_checkbox.addEventListener('change', function(event) {
        const tf = event.target.checked;
        if (tf) {
            map.addLayer(marker_group);
        } else {
            map.removeLayer(marker_group);
        }
    });




    /**
     * 地形図・航空写真の変更、年代の変更、地図の位置が変更されたときに実行される。
     * 変更後に表示されるべき地図が現在と同じかを検証し、必要があれば変更する。
     */
    function MapChanged() {
        // 表示している地図の中心座標
        const get_center = map.getCenter();
        const center_coordinate = [get_center.lat, get_center.lng];
        // スライダーの値
        const year = slider.noUiSlider.get(true);
        // 地図の状態
        let map_type = "";
        if (button.classList.contains('map-view')) {
            map_type = "kjmap";
        } else if (button.classList.contains('satellite-view')) {
            map_type = "photo";
        }

        const url_set = tile_loader.GetUrl(year, map_type, center_coordinate);
        if (url_set.url !== current_map_url) {
            current_map_url = url_set.url;
            // console.log(url_set.data_set)
            map_label.textContent = url_set.mapname;
            if (url_set.era[0] === -1) {
                era_label.textContent = "最新の地図"
            } else {
                era_label.textContent = String(url_set.era[0]) + "~" + String(url_set.era[1]) + "年";
            }
            tileLayer.setUrl(url_set.url);
        }
    }
}