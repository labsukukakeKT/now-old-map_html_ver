import FileNames from "./filenames.js";
import Spots from "../components/spots.js";
import gm from "./hoge/hoge.js";

gm();

// HTMLが完全に読み込まれた後にコードを実行する
document.addEventListener('DOMContentLoaded', function() {
    // 1. 地図を作成し、初期表示の中心座標とズームレベルを設定
    var map = L.map('map').setView([35.5117, 139.4754], 15); // [緯度, 経度], ズームレベル (例: 東京駅周辺)

    // 2. 地理院タイルのURLテンプレートを指定
    // 地理院タイルURL
    var gsistdTileUrl = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png';
    
    // 3. TileLayerを作成し、地図に追加
    var tileLayer = L.tileLayer(gsistdTileUrl, {
        // 著作権表示（必須）
        attribution: '出典: <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>, <ahref="https://ktgis.net/kjmapw/tilemapservice.html" target="_blank">今昔マップ on the web</a>',
        maxZoom: 18 // 最大ズームレベル
    }).addTo(map);



    // ベース地図の設定
    const base_selector = document.getElementById('base-dropdown');
    base_selector.addEventListener('change', baseChanged);

    // 年代別航空写真の設定
    const photo_selector = document.getElementById('photo-dropdown');
    photo_selector.addEventListener('change', photoChanged);

    // 今昔マップの設定
    const kjmap_selector = document.getElementById('topo-dropdown');
    kjmap_selector.addEventListener('change', topoChanged);


    let gsi_std_dataset = null;
    const gsi_std_file = FileNames.GSI_STD_JSON;
    fetch(gsi_std_file).then(response => {
        return response.json();
    }).then(data_std_tile => {
        console.log("JSONデータ読み込み完了: ", data_std_tile);

        gsi_std_dataset = data_std_tile;
        for (var i = 0; i < gsi_std_dataset.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = data_std_tile[i].DataSet; 
            base_selector.appendChild(option);
        }
    }).catch(error => {
        console.error("JSONファイル読み込み中にエラーが発生しました。: ", error);
    });


    let gsi_eraphoto_dataset = null;
    const eraphoto_json_file = FileNames.GSI_PHOTO_JSON;
    fetch(eraphoto_json_file).then(response => {
        return response.json();
    }).then(data_eraphoto_tile => {
        console.log("JSONデータ読み込み完了: ", data_eraphoto_tile);

        const eraphoto = data_eraphoto_tile.find(item => item.DataSet == "年代別航空写真")
        gsi_eraphoto_dataset = eraphoto;

        for (var i = 0; i < eraphoto.EraInfo.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = String(eraphoto.EraInfo[i].Era[0]) + "年～" + String(eraphoto.EraInfo[i].Era[1]) + "年";
            photo_selector.appendChild(option);
        }
    }).catch(error => {
        console.error("JSONファイル読み込み中にエラーが発生しました。: ", error);
    });


    // 今昔マップ on the webのタイルの読み込み
    let kjmap_dataset = null;
    const kjmap_json_file = FileNames.KJMAP_JSON;
    // fetchを使って非同期ファイルを読み込む
    fetch(kjmap_json_file).then(response => {
        // レスポンスがjson形式であることを指定し、文字列をJavaScriptのオブジェクトに変換(パース)
        return response.json();
    }).then(data_kjmap_tile => {
        console.log("JSONデータの読み込み完了: ", data_kjmap_tile);

        const shutoken = data_kjmap_tile.find(item => item.DataSet == "首都圏");
        kjmap_dataset = shutoken;
        // console.log(shutoken.EraInfo.length);
        
        for (var i = 0; i < shutoken.EraInfo.length; i++) {
            const option = document.createElement('option');
            let idx = shutoken.EraInfo.length - i - 1;
            option.value = idx;
            option.textContent = String(shutoken.EraInfo[idx].Era[0]) + "年～" + String(shutoken.EraInfo[idx].Era[1]) + "年";
            kjmap_selector.appendChild(option);
        }

        // kjmap_selector

    }).catch(error => {
        console.error("JSONファイル読み込み中にエラーが発生しました。: ", error);
    });







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



function baseChanged() {
    const element = document.getElementById('base-dropdown')
    const value = element.value;
    const url = gsi_std_dataset[value].EraInfo[0].EraFolder;
    tileLayer.setUrl(url);
}

function photoChanged() {
    const element = document.getElementById('photo-dropdown');
    const value = element.value;
    const url = gsi_eraphoto_dataset.EraInfo[value].EraFolder;
    tileLayer.setUrl(url)
}

function topoChanged() {
    const element = document.getElementById('topo-dropdown');
    const value = element.value;
    const ulr = "https://ktgis.net/kjmapw/kjtilemap/" + kjmap_dataset.DataSetFolder + "/" + kjmap_dataset.EraInfo[value].EraFolder + "/{z}/{x}/{-y}.png";
    tileLayer.setUrl(ulr);
}

})
