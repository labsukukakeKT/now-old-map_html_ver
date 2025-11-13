export default class TileLoader {
    /**
     * @param {string[]} json_filenames - JSONファイル名の配列
     * @param {string[]} json_propnames - クラスのプロパティ名の配列
     */
    constructor(json_filenames, json_propnames = ["topo_tile", "photo_tile", "kjmap_tile", "std_tile"]) {
        if (json_filenames.length !== json_propnames.length) {
            console.error("引数の要素数が不適切。");
            return;
        }

        this.filenames = json_filenames;
        this.propnames = json_propnames;
        this.data_promise = [];
        for (let i = 0; i < json_filenames.length; i++) {
            const filename = json_filenames[i];
            const propname = json_propnames[i];
            this.data_promise.push(this.JsonLoaderAwait(filename, propname));
        }

        this.propnames_era = ["topo_era", "photo_era"];
        this.topo_era = [];
        this.photo_era = [];
        this.kjmap_range = [];
        this.topo_tile = null;
        this.photo_tile = null;
        this.kjmap_tile = null;
        this.std_tile = null;
    }




    /**
     * コンストラクタの続き、JSONファイルが読み込まれた後に実行される。
     * "topo_tile", "photo_tile"についてオブジェクトから年代のみを配列として取り出し、クラスのプロパティに設定する。
     * 更に"kjmap_tile"の図郭範囲も配列として取り出し、プロパテ時に設定しておく
     */
    constructor2() {
        // オブジェクトキー"era"を配列として取り出す
        const prop_name_obj = this.propnames;
        const prop_name_out = this.propnames_era;
        for (let i = 0; i < 2; i++) {
            const tile_obj = this[prop_name_obj[i]];
            for (let j = 0; j < tile_obj.length; j++) {
                this[prop_name_out[i]].push(tile_obj[j].era)
            }
        }

        // オブジェクトキー"range"を配列として取り出す
        for (let j = 0; j < this.kjmap_tile.length; j++) {
            this.kjmap_range.push(this.kjmap_tile[j].range);
        } 
    }




    /**
     * 年代と地図の種類(地形図or航空写真)を引数として、地図タイルのURLを返す
     * @typedef {Object} map_data
     * @property {string} url - 地図タイルのURL
     * @property {number[]} era - 地図の年代範囲
     * @property {string} mapname - 地図の名前
     * 
     * @param {number} year - 表示する年。西暦表示。
     * @param {string} map_type - 地図or航空写真。'topo'もしくは'photo'できめる。
     * @param {number[]} position - 現在の緯度経度, maptypeが'kjmap'のときのみに使う
     * @returns {map_data} - 地図タイルのURLを含んだオブジェクト
     */
    GetUrl(year, map_type = "topo", position = [0, 0]) {
        // 引数'type'の検証
        const valid_types = ["topo", "photo", "kjmap"];
        if (!valid_types.includes(map_type)) {
            console.error(`無効なtypeです:${map_type}。'topo'か'photo'のいずれかを入力して`);
            map_type = "topo";
        }


        if (map_type === valid_types[2]) {
            // typeがkjmapのときは処理が異なるので別の関数内で記述する
            const url = this.GetKjmapUrl(year, position);
            this.current_url = url;
            return this.current_url;
        }

        let tile_obj = [];
        let era_array = [];
        let map_data = new Object();
        map_data.url = "";
        map_data.era = [];
        map_data.mapname = "";
        if (map_type === valid_types[0]) {
            tile_obj = this.topo_tile;
            era_array = this.topo_era;
        } else if (map_type === valid_types[1]) {
            tile_obj = this.photo_tile;
            era_array = this.photo_era;
        }

        // 2番目に新しい地図の範囲より上であれば、最新地図にする
        if (year > era_array[1][1]) {
            map_data.url = tile_obj[0].url;
            map_data.era = tile_obj[0].era;
            map_data.mapname = tile_obj[0].data_set;
            return map_data;
        } else {
            let idx = this.FindContainInterval(era_array, year);
            map_data.url = tile_obj[idx].url;
            map_data.era = tile_obj[idx].era;
            map_data.mapname = tile_obj[idx].data_set;
            return map_data;
        }
    }




    /**
     * kjmapのタイルは地域ごとに異なるURLになっているので、適切なURLを返せるようにする。
     * @typedef {Object} map_data
     * @property {string} url - 地図タイルのURL
     * @property {number[]} era - 地図の年代範囲
     * @property {string} mapname - 地図の名前
     * 
     * @param {number} year 
     * @param {number[]} position - 緯度経度
     * @returns {map_data} - 地図タイルのURLを含んだオブジェクト
     */
    GetKjmapUrl(year, position) {
        let map_data = new Object();
        map_data.url = "";
        map_data.era = [];
        map_data.mapname = "";

        // 位置の検証、現在地がどの図郭に含まれるか
        const area_id = this.FindContainInterval2D(this.kjmap_range, position);
        const data_set_str = this.kjmap_tile[area_id].data_set_folder;
        // 該当地域の、どの年代に該当するのかの検証, year_arrayはGetUrl()のera_arrayと違う構成なので注意
        let year_array = [];
        for (let i =0; i < this.kjmap_tile[area_id].era_info.length; i++) {
            year_array.push(this.kjmap_tile[area_id].era_info[i].era);
        }
        // 2番目に新しい地図の範囲より上であれば、最新地図にする
        if (year > year_array.at(-1)[1]) {
            // この場合はtopo_tileに記述される最新の標準地図を使う
            map_data.url = this.topo_tile[0].url;
            map_data.era = this.topo_tile[0].era;
            map_data.mapname = this.topo_tile[0].data_set;
            return map_data;
        } else {
            const idx = this.FindContainInterval(year_array, year);
            const era_folder_str = this.kjmap_tile[area_id].era_info[idx].era_folder;
            const url = "https://ktgis.net/kjmapw/kjtilemap/" + data_set_str + "/" + era_folder_str + "/{z}/{x}/{-y}.png"
            map_data.url = url;
            map_data.era = this.kjmap_tile[area_id].era_info[idx].era;
            map_data.mapname = this.kjmap_tile[area_id].data_set;
            return map_data;
        }
    }




    /**
     * @param {string} filename - JSONファイルのパス
     * @param {string} propname - クラスのプロパティのキーの名前
     * @returns {object} - JSONファイルをパースしたobject型
     */
    async JsonLoaderAwait(filename, propname) {
        try {
            // fetchの完了を待つ
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error("Network response was not ok.");
            }
            // fetchの完了を待つ
            const data = await response.json();
            // console.log(`JSON読み込み完了: ${filename}`, data);
            this[propname] = data;
            return data;
        } catch (error) {
            console.error(`JSON ${filename} の読み込みでエラーが発生しました。`, error);
            return null;
        }
    }




    /**
     * Promiseチェーンを使った書き方、こっちは使わないかも
     * JsonLoaderAwait()の古いバージョン
     * @param {string} filename - JSONファイルのパス
     * @returns {object} 
     */
    JsonLoaderPromisechain(filename) {
        fetch(filename).then(response => {
            return response.json();
        }).then(data => {
            console.log("JSON読み込み完了", data);
            this.data = data;
            return data;
        }).catch(error => {
            console.error("JSONファイルの読み込み中にエラーが発生しました。:", error);
        })
    }




    /**
     * 数値がどの区間に含まれるかをチェックする
     * どの区間にも含まれなかった場合、最も近い区間を見つける。
     * 「近さ」はtargetと、各区間の始点・終点との差の絶対値が最小となる区間として定義する
     * @param {number[][]} intervals - 区間配列[[start, end], [],...]
     * @param {number} target - 検証したい数値
     * @return {number} - 含まれる区間のインデックス
     */
    FindContainInterval(intervals, target) {
        let min_distance = Infinity;
        let closest_id = -1;
        let in_interval = false;

        for (let i = 0; i < intervals.length; i++) {
            const [start, end] = intervals[i];
            // targetがこの区間内にあるか
            if (start <= target && target <= end) {
                in_interval = true;
                return i;
            }
            const dist_start = Math.abs(target - start);
            const dist_end = Math.abs(target - end);
            const current_distance = Math.min(dist_start, dist_end);

            // 最小値を更新
            if (current_distance < min_distance) {
                min_distance = current_distance;
                closest_id = i;
            }
        }
        return closest_id;
    }




    /**
     * FindContaIntervalを二次元に拡張したもの。
     * 地図上の1点の座標をtargetとしたときに、それがどのintervalsとして定義される図郭のどこに該当するかを計算する
     * @param {number[][][]} intervals - 図郭の配列。[[[南端緯度, 西端経度], [北端緯度, 東端経度]], [[],[]],...]の形式。
     * @param {number[]} target - どの図郭に含まれるかを知りたい座標。[緯度, 経度]で表せる。
     * @returns {number} - 該当するintervalsのインデックス。
     */
    FindContainInterval2D(intervals, target) {
        let min_distance = Infinity;
        let closest_id = -1;
        let in_interval = false;
        const [target_lat, target_lng] = target;

        for (let i = 0; i < intervals.length; i++) {
            const [[sw_lat, sw_lng], [ne_lat, ne_lng]] = intervals[i];
            // ターゲットがこの区間内にあるか
            if ((sw_lat <= target_lat && target_lat <= ne_lat) && (sw_lng <= target_lng && target_lng <= ne_lng)) {
                in_interval = true;
                return i;
            }
            // ターゲットと、図郭の距離の計算
            const dist_lat = Math.min(Math.abs(target_lat - sw_lat), Math.abs(target_lat - ne_lat));
            const dist_lng = Math.min(Math.abs(target_lng - sw_lng), Math.abs(target_lng - ne_lng));
            const current_distance = dist_lat ** 2 + dist_lng ** 2; // 簡単のため平方根はとらない

            // 最小値の更新
            if (current_distance < min_distance) {
                min_distance = current_distance;
                closest_id = i;
            }
        }
        return closest_id;
    }
}