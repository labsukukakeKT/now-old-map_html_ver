export default function setSlider(slider) {
    const yearFormat = wNumb({
        decimals: 0,   // ★★★ 最重要: 小数点以下を0桁に設定する
        thousand: '',  // カンマなし
        suffix: '年'   // 単位として「年」を付ける
    });
    
    noUiSlider.create(slider, {
        // スライダーの初期値
        start: [2025],
        // 最小値と最大値
        range: {
            'min': 1890,
            'max': 2025
        },
        // スライダーの動きのステップ
        step: 1, 
        tooltips: true, // つまみといっしょに動くポップアップ
        format: yearFormat,

        // 目盛りの設定 (Pips)
        pips: {
            // mode: 'count', // 目盛りを表示するモード: 'count'は目盛りの数を指定
            mode: 'steps',
            // density: 4, // 密度。ここでは25年ごとに目盛りをつけるための目安として設定
            // stepped: true,
            filter: function (value, type) {
                if (value % 10 === 0) { // 25年ごと
                    return 1; // 目盛りを表示する
                }
                return -1; // 目盛りを表示しない
            },
            
            format: yearFormat
        }
    });
}