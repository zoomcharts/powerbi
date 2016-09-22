
module powerbi.extensibility.visual {
    export function logExceptions(): MethodDecorator {
        return function (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<Function>)
            : TypedPropertyDescriptor<Function> {
            return {
                value: function () {
                    try {
                        return descriptor.value.apply(this, arguments);
                    } catch (e) {
                        console.error(e);
                        throw e;
                    }
                }
            }
        }
    }

    export class Visual implements IVisual {
        private target: HTMLElement;
        private chart: ZoomCharts.TimeChart;
        private ZC: typeof ZoomCharts;

        constructor(options: VisualConstructorOptions) {
            this.target = options.element;

            // workaround for the host not calling `destroy()` when the visual is reloaded:
            if ((<any>this.target).__zc_visual) {
                (<any>this.target).__zc_visual.destroy();
            }

            (<any>this.target).__zc_visual = this;

            this.chart = null;

            this.target.innerHTML = "Loading ZoomCharts. Please wait...";

            ZoomChartsLoader.ensure((zc) => this.createChart(zc), () => {
                if (this.target) {
                    this.target.innerHTML = "Cannot load ZoomCharts library. This visual requires internet connectivity.";
                    this.target.style.color = "red";
                }
            });
        }

        private createChart(zc: typeof ZoomCharts) {
            // check if the visual is destroyed before chart is created.
            if (!this.target)
                return;

            this.ZC = zc;
            
            this.chart = new zc.TimeChart({
                container: this.target,
                data:
                [{
                    units: ["h"],
                    url: "https://zoomcharts.com/dvsl/data/time-chart/temperature-kuldiga-h.json"
                }],
                interaction: {
                    resizing: { enabled: false }
                },
                assetsUrlBase: ZoomChartsLoader.RootUrl + "assets/"
            });
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
            console.log(options);

            let dataView = options.dataViews[0];
            if (!dataView) {
                console.warn("No data received");
                return;
            }

            if (!dataView.categorical) {
                console.warn("non-categorical data retrieved");
                return;
            }

            if (!dataView.categorical.values) {
                console.warn("no value field selected");
                return;
            }
            
            console.log("grouped", dataView.categorical.values.grouped());

            let times = dataView.categorical.categories[0].values;
            let values = dataView.categorical.values.grouped();
            
            let result: Array<(string|Date|number)[]> = new Array(times.length); 
            for (let i = 0; i < times.length; i++) {
                let x: Array<string|Date|number> = new Array(values.length + 1);
                x[0] = times[i];
                
                for (let j = 0; j < values.length; j++)
                    x[j + 1] = values[j].values[0].values[i];
                
                result[i] = x;
            }

            console.log("DATA", result);
        }

        @logExceptions()
        public destroy(): void {
            this.target = null;
            if (this.chart) {
                this.chart.remove();
                this.chart = null;
            }
        }
    }
}