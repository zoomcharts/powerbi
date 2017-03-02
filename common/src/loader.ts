module powerbi.extensibility.visual {
    export class ZoomChartsLoader {
        private static _successCallbacks: Array<(zc: typeof ZoomCharts) => void> = [];
        private static _failCallbacks: Array<() => void> = [];
        private static _loaded = false;
        private static _failed = false;
        private static _started = false;
        private static _zc: typeof ZoomCharts = null;

        public static RootUrl = "https://cdn.zoomcharts-cloud.com/1/17/latest/";

        public static CacheKey = "ZoomChartsLoader 1/17";

        public static ensure(success: (zc: typeof ZoomCharts) => void, fail: () => void) {
            let instance: typeof ZoomChartsLoader = (<any>window)[this.CacheKey];
            return instance.ensureInternal(success, fail);
        }

        private static ensureInternal(success: (zc: typeof ZoomCharts) => void, fail: () => void) {
            if (this._loaded) {
                // defer the callback
                window.setTimeout(this._failed ? fail : () => success(this._zc), 1);
                return;
            }

            this._successCallbacks.push(success);
            this._failCallbacks.push(fail);

            if (this._started) {
                return;
            }

            this._started = true;

            let counter = 2;
            let reqGlobalize = new XMLHttpRequest();
            let reqZoomCharts = new XMLHttpRequest();

            let error = () => {
                console.error("Failed to load ZoomCharts assets.");
                this._loaded = true;
                this._failed = true;
                if (this._failCallbacks) {
                    this._failCallbacks.forEach(a => a());
                }
                this._failCallbacks = null;
                this._successCallbacks = null;
            };

            let self = this;
            let complete: (/*this: XMLHttpRequest*/) => void = function (/*this: XMLHttpRequest*/) {
                if (this.status !== 200) {
                    error();
                    return;
                }

                counter--;
                if (counter === 0) {
                    let globals: any;
                    try {
                        // using the eval() might no longer be needed but it was before the custom visual was
                        // isolated in its own iframe. This approach allows not to replace the global moment
                        // library with the one that is bundled with ZoomCharts.
                        globals = eval(`
                        var w = window.window;
                        (function() {
                            function Temp() { 
                                // workaround for some issues coming from the wrapped window object.
                                // window.window seems to refer to the real/original window object.
                                var window = w;

                                ${reqGlobalize.responseText};
                                ${reqZoomCharts.responseText};
                                this.ZoomCharts = ZoomCharts;
                            };
                            return new Temp();
                        })();
                    `);
                    } catch (e) {
                        console.error(e);
                        error();
                        return;
                    }

                    // assign to the implicit global so that powerbi formatter code can use it.
                    Globalize = globals.Globalize;

                    self._loaded = true;
                    self._failed = false;
                    self._zc = globals.ZoomCharts;
                    self._successCallbacks.forEach(a => a(self._zc));
                    self._failCallbacks = null;
                    self._successCallbacks = null;
                }
            };

            reqGlobalize.open("GET", "https://cdnjs.cloudflare.com/ajax/libs/globalize/0.1.1/globalize.min.js");
            reqGlobalize.onload = complete;
            reqGlobalize.onerror = error;
            reqGlobalize.send();

            reqZoomCharts.open("GET", this.RootUrl + "zoomcharts.js");
            reqZoomCharts.onload = complete;
            reqZoomCharts.onerror = error;
            reqZoomCharts.send();
        }
    }

    // make sure that multiple visuals will always use a single ZCLoader.
    if (!(<any>window)[ZoomChartsLoader.CacheKey]) {
        (<any>window)[ZoomChartsLoader.CacheKey] = ZoomChartsLoader;
    }
}