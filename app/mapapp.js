// HTMLが完全に読み込まれた後にコードを実行する
document.addEventListener('DOMContentLoaded', function() {

    let map = L.map('map').setView([35.5117, 139.4754], 15);
    let gsistdTileUrl = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png';

    let tilelayer = L.tileLayer(gsistdTileUrl, {
        // 著作権表示（必須）
        attribution: '出典: <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        maxZoom: 18
    }).addTo(map);
})