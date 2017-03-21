module powerbi.extensibility.visual {
    window.ZoomChartsLicense = "ZCF-6sag05711-16: ZoomCharts Custom Visual free licence for use in Microsoft PowerBI Projects (for TimeChart); upgrades until: 2018-08-03";
    window.ZoomChartsLicenseKey = "1cd1965a013d1e8a15f110c4dc59c697e3bbb77e91246c4b0f" +
        "73d1f42480151f3908185151424f0e48b9dda27e4f6bbf0f54c39542b7d44c88f9ef6766f5264" +
        "8fb585623d85ebeb8bd7a8847f4a14d50c57c7c8d3176d5f84f69c4f2c50b1ed555387ccd67b7" +
        "75af8147d5b6778690a67cc114a18ca8ee110c71e91a495045b5a966a435f8f6fff4fdf1b3878" +
        "e58c97b826a00d5e9e7d3a08813b25c70bb1d34e7f6e3be673348df3993798d40934f0e1b2656" +
        "fd65d19327c0a85eddf4ba91d2be1f86329aa709f8283ce7517c35cdcb70f4140fa37c2b85bbf" +
        "c541360474c494ee8126f44dc88b1aba5567e47c72c324748128c7c8b540fd964b45f7437a025";


    export class Visual implements IVisual {
        protected target: HTMLElement;
        protected chart: ZoomCharts.TimeChart;
        protected ZC: typeof ZoomCharts;
        protected host: IVisualHost;
        protected dataObj: ZoomCharts.Configuration.TimeChartDataObject = { from: 0, to: 0, unit: "d", values: [] };
        protected dataIds: ISelectionId[] = [];
        protected pendingSettings: ZoomCharts.Configuration.TimeChartSettings = {};
        protected updateTimer: number;
        protected lastTimeRange: [number, number] = [null, null];
        protected colors: IColorPalette;
        protected selectionManager: ISelectionManager;
        protected setLegendState = true;
        protected series: ZoomCharts.Configuration.FacetChartSettingsSeries[] = [];

        constructor(options: VisualConstructorOptions) {
            this.target = options.element;
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();

            // if possible, use our own color palette because the default gets its colorIndex reset
            // to 0 when data changes. This results in the colors repeating as new series are added
            this.colors = createColorPalette(this.host);

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

        protected createChart(zc: typeof ZoomCharts) {
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
                info: {
                    valueFormatterFunction: (values, series) => {
                        if (!values) return "-";
                        return powerbi.extensibility.utils.formatting.valueFormatter.format(
                            values[series.data.aggregation],
                            series.extra.format);
                    }
                },
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
                            if (args.selectionStart === args.hoverStart && args.selectionEnd === args.hoverEnd) {
                                this.chart.selection(null, null);
                            } else {
                                this.chart.selection(args.hoverStart, args.hoverEnd);
                            }
                            e.preventDefault();
                        }
                    },
                    onSelectionChange: (e, args) => this.updateSelection(args, 200),
                    onChartUpdate: (e, args) => {
                        //if (args.origin === "user")
                        //    this.updateSelection(args, 500);
                    }
                },
                toolbar: {
                    export: false
                },
                timeAxis: {
                    timeZone: "local"
                },
                valueAxisDefault: {
                    enabled: false
                },
                valueAxis: {
                    "primary": {
                        side: "left",
                        enabled: true
                    },
                    "secondary": {
                        side: "right",
                        enabled: false
                    }
                },
                assetsUrlBase: ZoomChartsLoader.RootUrl + "assets/"
            });

            this.chart.replaceSettings(this.pendingSettings);

            this.pendingSettings = null;
        }

        protected updateSeries(istr: string, series: ZoomCharts.Configuration.TimeChartSettingsSeries) {
        }

        protected createSeries(options: VisualUpdateOptions, legendState: boolean = null) {
            let dataView = options.dataViews[0];
            if (!dataView || !dataView.categorical)
                return;

            let values = dataView.categorical.values;
            if (!values || !values.length)
                return;

            let series: ZoomCharts.Configuration.TimeChartSettingsSeriesColumns[] = [];
            for (let i = 0; i < values.length; i++) {
                let column = values[i];
                let istr = (i + 1).toFixed(0);

                for (let role in column.source.roles) {
                    if (role !== "Values") {
                        istr = role.substr(6);
                    }

                    let color = this.colors.getColor("zc-fc-color-" + istr);
                    let s = <ZoomCharts.Configuration.TimeChartSettingsSeriesColumns>{
                        type: "columns",
                        id: "s" + istr,
                        name: column.source.displayName,
                        extra: { format: column.source.format },
                        data: { index: i + 1 },
                        valueAxis: "primary",
                        style: {
                            fillColor: color.value,
                            gradient: 0,
                        }
                    };
                    this.updateSeries(istr, s);

                    series.push(s);
                }

                series.sort((a, b) => a.id.localeCompare(b.id));
            }

            this.series = series;

            let settings: ZoomCharts.Configuration.TimeChartSettings = {
                series: series,
                legend: this.setLegendState ? { enabled: series.length > 1 } : void 0,
            }

            if (this.chart) {
                this.chart.replaceSettings(settings);
            } else {
                this.pendingSettings = settings;
            }
        }

        protected updateSelection(args: ZoomCharts.Configuration.TimeChartChartEventArguments, delay: number) {
            if (this.updateTimer) window.clearTimeout(this.updateTimer);

            window.setTimeout(() => {
                let selman = this.selectionManager;

                var time = this.chart.selection();
                //if (time[0] == null)
                //    time = this.chart.targetTime();

                if (!this.dataObj)
                    return;

                if (this.lastTimeRange[0] === time[0] && this.lastTimeRange[1] === time[1])
                    return;

                this.lastTimeRange = time;

                if (time[0] === null || (time[0] <= this.dataObj.from && time[1] >= this.dataObj.to)) {
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

                    let cursel = selman.getSelectionIds();
                    if (!arraysEqual(cursel, ids, (a: any, b: any) => a.key === b.key)) {
                        selman.clear();
                        selman.select(ids, false);
                    } else if (isDebugVisual) {
                        console.log("Selection not being updated because getSelectionIds() matches the requested selection. It is possible that the selection is not actually being applied in some cases because of what seems to be a bug in PowerBI.");
                    }
                }
            }, delay);
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
            if (options.type & VisualUpdateType.Data) {
                this.createSeries(options);
                let root = Data.convert(this.host, this.target, options);
                let lastDataObj = this.dataObj;
                this.dataObj = root.data;
                this.dataIds = root.ids;

                if (this.chart) {
                    let sel = this.chart.selection();
                    this.chart.replaceSettings({
                        data: [{
                            units: [root.data.unit],
                            preloaded: root.data
                        }]
                    });
                    this.chart.replaceData(root.data);

                    if (lastDataObj.dataLimitFrom !== root.data.dataLimitFrom || lastDataObj.dataLimitTo !== root.data.dataLimitTo) {
                        let unit = new this.ZC.Internal.TimeChart.TimeStep(root.data.unit, 1);
                        this.chart.time(<number>root.data.from, unit.add(<number>root.data.to, 1), false);
                    } else {

                    }

                    this.chart.selection(sel[0], sel[1]);

                    /*
                    if (lastDataObj && lastDataObj.dataLimitTo === 1) {
                        this.chart.time(<number>root.data.from, <number>root.data.to, false);
                    } else {
                        let ct = this.chart.time();
                        if (ct[0] !== null) {
                            this.chart.time(Math.max(ct[0], <number>root.data.from), Math.min(ct[1], <number>root.data.to), false);
                        }
                    }
                    */
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