module powerbi.extensibility.visual {
    export class ZoomChartsLoader {
        private static _successCallbacks: Array<(zc: typeof ZoomCharts) => void> = [];
        private static _failCallbacks: Array<() => void> = [];
        private static _loaded = false;
        private static _failed = false;
        private static _started = false;
        private static _zc: typeof ZoomCharts = null;

        public static RootUrl = "https://cdn.zoomcharts-cloud.com/1/nightly/";

        public static CacheKey = "ZoomChartsLoader 1/nightly";

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

            let counter = 1;
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