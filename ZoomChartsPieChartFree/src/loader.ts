module powerbi.extensibility.visual {
    export class ZoomChartsLoader {
        private static _successCallbacks: Array<(zc: typeof ZoomCharts) => void> = [];
        private static _failCallbacks: Array<() => void> = [];
        private static _loaded = false;
        private static _failed = false;
        private static _started = false;
        private static _zc: typeof ZoomCharts = null;

        public static RootUrl = "https://cdn.zoomcharts-cloud.com/1/16/3/";

        public static CacheKey = "ZoomChartsLoader 1/16/3";

        public static ensure(success: (zc: typeof ZoomCharts) => void, fail: () => void) {
            let instance: typeof ZoomChartsLoader = (<any>window)[this.CacheKey];
            return instance.ensureInternal(success, fail);
        }

        private static ensureInternal(success: (zc: typeof ZoomCharts) => void, fail: () => void) {
            if (this._loaded) {
                // defer the callback
                window.setTimeout(this._failed ? fail : () => success(this._zc), 1000);
                return;
            }

            this._successCallbacks.push(success);
            this._failCallbacks.push(fail);

            if (this._started) {
                return;
            }
            
            this._started = true;

            // powerbi web app at the time of the development included moment version 2.8.3 which is not supported by ZoomCharts
            let counter = 3;
            let reqMoment = new XMLHttpRequest();
            let reqMomentTz = new XMLHttpRequest();
            let reqZoomCharts = new XMLHttpRequest();

            let error = () => {
                console.error("Failed to load ZoomCharts assets.");
                this._loaded = true;
                this._failed = true;
                this._failCallbacks.forEach(a => a());
                this._failCallbacks = null;
                this._successCallbacks = null;
            };

            let complete = () => {
                counter--;
                if (counter === 0) {
                    var zc = eval(`
                        (function() {
                            function Temp() { 
                                ${reqMoment.responseText};
                                ${reqMomentTz.responseText}; 
                                ${reqZoomCharts.responseText};
                                ZoomCharts.Internal.TimeChart.moment = this.moment;

                                this.zc = ZoomCharts;
                            };
                            return new Temp().zc;
                        })();
                    `);

                    this._loaded = true;
                    this._failed = false;
                    this._zc = zc;
                    this._successCallbacks.forEach(a => a(zc));
                    this._failCallbacks = null;
                    this._successCallbacks = null;
                }
            };

            reqMoment.open("GET", this.RootUrl + "assets/moment.js");
            reqMoment.onload = complete;
            reqMoment.onerror = error;
            reqMoment.send();

            reqMomentTz.open("GET", this.RootUrl + "assets/moment-tz.js");
            reqMomentTz.onload = complete
            reqMomentTz.onerror = error;
            reqMomentTz.send();

            // load the 1.15 version. Fixing the version reduces the chance an upgrade breaks the visual
            reqZoomCharts.open("GET", this.RootUrl + "zoomcharts.js");
            reqZoomCharts.onload = complete
            reqZoomCharts.onerror = error;
            reqZoomCharts.send();
        }
    }

    // make sure that multiple visuals will always use a single ZCLoader.
    if (!(<any>window)[ZoomChartsLoader.CacheKey]) {
        (<any>window)[ZoomChartsLoader.CacheKey] = ZoomChartsLoader;
    }
}