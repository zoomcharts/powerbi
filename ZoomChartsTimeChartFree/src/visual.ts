module powerbi.extensibility.visual {
    export class Visual implements IVisual {
        private target: HTMLElement;
        private chart: ZoomCharts.TimeChart;
        private ZC: typeof ZoomCharts;
        private host: IVisualHost;
        private dataObj: ZoomCharts.Configuration.TimeChartDataObject = { from: 0, to: 0, unit: "d", values: [] };
        private dataIds: ISelectionId[] = [];
        private pendingSettings: ZoomCharts.Configuration.TimeChartSettings = {};
        private updateTimer: number;
        private lastTimeRange: [number, number] = [null, null];

        constructor(options: VisualConstructorOptions) {
            this.target = options.element;
            this.host = options.host;

            // workaround for the host not calling `destroy()` when the visual is reloaded:
            if ((<any>this.target).__zc_visual) {
                (<any>this.target).__zc_visual.destroy();
            }

            (<any>this.target).__zc_visual = this;

            this.chart = null;

            // this.target.innerHTML = "Loading ZoomCharts. Please wait...";

            ZoomChartsLoader.ensure((zc) => this.createChart(zc), () => {
                displayMessage(this.target, "Cannot load ZoomCharts library. This visual requires internet connectivity.", "Error", true);
            });
        }

        private createChart(zc: typeof ZoomCharts) {
            // check if the visual is destroyed before chart is created.
            if (!this.target)
                return;

            this.ZC = zc;

            let chartContainer = document.createElement("div");
            chartContainer.className = "chart-container";
            this.target.appendChild(chartContainer);

            this.chart = new zc.TimeChart({
                container: chartContainer,
                data:
                [{
                    units: [this.dataObj.unit],
                    preloaded: this.dataObj,
                    suppressWarnings: true
                }],
                interaction: {
                    selection: { enabled: true },
                    resizing: { enabled: false }
                },
                events: {
                    onClick: (e, args) => {
                        if (e.ctrlKey && args.hoverStart) {
                            this.chart.selection(args.hoverStart, args.hoverEnd);
                            e.preventDefault();
                            return;
                        }

                        let du = this.chart.displayUnit();
                        if (this.dataObj && args.hoverStart && du === "1 " + this.dataObj.unit) {
                            this.chart.selection(args.hoverStart, args.hoverEnd);
                            e.preventDefault();
                        }
                    },
                    onSelectionChange: (e, args) => this.updateSelection(args, 200),
                    onChartUpdate: (e, args) => {
                        if (args.origin === "user")
                            this.updateSelection(args, 500);
                    }
                },
                toolbar: {
                    export: false
                },
                timeAxis: {
                    timeZone: "local"
                },
                assetsUrlBase: ZoomChartsLoader.RootUrl + "assets/"
            });

            this.chart.replaceSettings(this.pendingSettings);

            this.pendingSettings = null;
        }

        private createSeries(options: VisualUpdateOptions) {
            let dataView = options.dataViews[0];
            if (!dataView || !dataView.categorical)
                return;

            let values = dataView.categorical.values;
            if (!values || !values.length)
                return;

            let series: ZoomCharts.Configuration.TimeChartSettingsSeriesColumns[] = [];
            for (let i = 0; i < values.length; i++) {
                let column = values[i];
                let istr = i.toFixed(0);
                series.push({
                    type: "columns",
                    id: "s" + istr,
                    name: column.source.displayName,
                    data: { index: i + 1 },
                    style: {
                        fillColor: this.host.colorPalette.getColor("zc-tc-color-" + istr).value,
                        gradient: 0,
                    }
                });
            }

            let settings: ZoomCharts.Configuration.TimeChartSettings = {
                series: series,
                legend: { enabled: series.length > 1 },
            }

            if (this.chart) {
                this.chart.replaceSettings(settings);
            } else {
                this.pendingSettings = settings;
            }
        }

        private updateSelection(args: ZoomCharts.Configuration.TimeChartChartEventArguments, delay: number) {
            if (this.updateTimer) window.clearTimeout(this.updateTimer);

            window.setTimeout(() => {
                let selman = this.host.createSelectionManager();

                var time = this.chart.selection();
                if (time[0] == null)
                    time = this.chart.targetTime();

                if (time[0] == null || !this.dataObj)
                    return;

                if (this.lastTimeRange[0] === time[0] && this.lastTimeRange[1] === time[1])
                    return;

                this.lastTimeRange = time;

                if (time[0] <= this.dataObj.from && time[1] >= this.dataObj.to) {
                    selman.clear();
                } else {
                    let ids = [];
                    for (let i = 0; i < this.dataObj.values.length; i++) {
                        let v = this.dataObj.values[i];
                        let t = <number>v[0];

                        //if (t >= time[0] && t < time[1]) continue;
                        if (t < time[0]) continue;
                        if (t >= time[1]) break;

                        ids.push(this.dataIds[v[v.length - 1]]);
                    }

                    selman.select(ids, false);
                }
            }, delay);
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
            if (options.type & VisualUpdateType.Data) {
                this.createSeries(options);
                let root = Data.convert(this.host, this.target, options);
                this.dataObj = root.data;
                this.dataIds = root.ids;

                if (this.chart) {
                    this.chart.replaceSettings({
                        data: [{
                            units: [root.data.unit],
                            preloaded: root.data
                        }]
                    });
                    this.chart.replaceData(root.data);

                    let ct = this.chart.time();
                    if (ct[0] !== null) {
                        this.chart.time(Math.max(ct[0], <number>root.data.from), Math.min(ct[1], <number>root.data.to), false);
                    }
                }
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