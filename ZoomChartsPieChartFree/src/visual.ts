
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
                events: {
                    onClick: (e, args) => {
                        let slice = args.clickSlice;
                        if (e.ctrlKey && slice) {
                            let sel = args.selection;
                            if (slice.selected) {
                                sel.splice(sel.indexOf(slice), 1);
                            } else {
                                sel.push(slice);
                            }
                            this.chart.selection(sel);
                            e.preventDefault();
                        }
                    },
                    onSelectionChange: (e, args) => this.updateSelection(args),
                    onChartUpdate: (e, args) => this.updateSelection(args),
                },
                assetsUrlBase: ZoomChartsLoader.RootUrl + "assets/"
            });

            this.pendingData = null;
        }

        private updateSelection(args: ZoomCharts.Configuration.PieChartChartEventArguments) {
            let selman = this.host.createSelectionManager();
            let selectedSlices = (args.selection || []).map(o => o.data);
            if (!selectedSlices.length && args.pie.id) {
                selectedSlices = args.pie.data.values;
            }

            if (selectedSlices.length) {
                let sel: visuals.ISelectionId[] = [];
                for (let i = 0; i < selectedSlices.length; i++) {
                    sel = sel.concat(selectedSlices[i].extra);
                }
                console.log("Updating selection", sel);
                selman.select(sel, false);
            } else {
                selman.clear();
            }
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
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

            let root: ZoomCharts.Configuration.PieChartDataObjectRoot = {
                id: "",
                subvalues: [],
                extra: []
            };

            let values = dataView.categorical.values[0].values;

            let catCount = dataView.categorical.categories.length;
            let ids: Array<visuals.ISelectionId> = new Array(values.length);
            let parentObjects: Array<ZoomCharts.Configuration.PieChartDataObject> = new Array(values.length);
            let grouper: ZoomCharts.Dictionary<ZoomCharts.Configuration.PieChartDataObject>;
            for (let i = 0; i < values.length; i++) {
                parentObjects[i] = <any>root;
                ids[i] = this.host.createSelectionIdBuilder().withCategory(dataView.categorical.categories[0], i).createSelectionId();
            }

            for (let c = 0; c < catCount; c++) {
                let expandable = c < catCount - 1;
                let categories = dataView.categorical.categories[c];
                let grouper = Object.create(null);
                for (let i = 0; i < values.length; i++) {
                    let parent = parentObjects[i];
                    let idVal = parent.id + "\ufdd0" + categories.values[i];

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
                            extra: [ids[i]]
                        };
                        parent.value += <number>values[i];
                        parent.subvalues.push(obj);
                        grouper[idVal] = obj;
                    } else {
                        obj.extra.push(ids[i]);
                        obj.value += values[i];
                    }

                    parentObjects[i] = obj;
                }
            }

            if (this.chart) {
                this.chart.replaceData(root);
            } else {
                this.pendingData = root;
            }
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