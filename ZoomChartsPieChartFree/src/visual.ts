
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
        private chart: ZoomCharts.PieChart;
        private ZC: typeof ZoomCharts;
        private host: IVisualHost;
        private pendingData: ZoomCharts.Configuration.PieChartDataObjectRoot = { subvalues: [] };

        constructor(options: VisualConstructorOptions) {
            this.target = options.element;
            this.host = options.host;

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

            this.chart = new zc.PieChart({
                container: this.target,
                data:
                [{
                    preloaded: this.pendingData,
                    sortField: "value"
                }],
                interaction: {
                    resizing: { enabled: false }
                },
                assetsUrlBase: ZoomChartsLoader.RootUrl + "assets/"
            });

            this.pendingData = null;
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

            if (!dataView.categorical.categories) {
                console.warn("no category field selected");
                return;
            }

            if (!dataView.categorical.values) {
                console.warn("no value field selected");
                return;
            }
            /*            
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
                        */

            let root: ZoomCharts.Configuration.PieChartDataObjectRoot = {
                id: "",
                subvalues: [],
                extra: []
            };

            let values = dataView.categorical.values[0].values;

            let catCount = dataView.categorical.categories.length;
            let ids: Array<visuals.ISelectionId> = new Array(values.length);
            let parentObjects: Array<ZoomCharts.Configuration.PieChartDataObject[]> = new Array(values.length);
            let grouper: ZoomCharts.Dictionary<ZoomCharts.Configuration.PieChartDataObject>;
            for (let i = 0; i < values.length; i++) {
                parentObjects[i] = new Array(catCount);
                parentObjects[i][0] = <any>root;
                ids[i] = this.host.createSelectionIdBuilder().withCategory(dataView.categorical.categories[0], i).createSelectionId();
            }

            for (let c = 0; c < catCount; c++) {
                let expandable = c < catCount - 1;
                let categories = dataView.categorical.categories[c];
                let grouper = Object.create(null);
                for (let i = 0; i < values.length; i++) {
                    for (let x = 0; x < c; x++) {
                        parentObjects[i][c].extra.push(i);
                    }

                    let parent = parentObjects[i][c];
                    let idVal = parent.id + categories.values[i];

                    let obj = grouper[idVal];
                    if (!obj) {
                        //console.log(categories.values[i], idVal);
                        obj = {
                            value: values[i],
                            name: categories.values[i],
                            id: idVal,
                            subvalues: [],
                            style: {
                                expandable: expandable
                            },
                            extra: [i]
                        };
                        parent.value += <number>values[i];
                        parent.subvalues.push(obj);
                        grouper[idVal] = obj;
                    } else {
                        obj.value += values[i];
                        obj.extra.push(i);
                    }

                    if (expandable)
                        parentObjects[i][c + 1] = obj;
                }
            }

            if (this.chart) {
                this.chart.replaceData(root);
            } else {
                this.pendingData = root;
            }

            console.log(root.subvalues);
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