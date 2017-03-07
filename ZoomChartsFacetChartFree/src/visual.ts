module powerbi.extensibility.visual {
    window.ZoomChartsLicense = "ZCF-0wv4bd3ok-1: ZoomCharts Custom Visual free licence for use in Microsoft PowerBI Projects (for FacetChart); upgrades until: 2017-05-01";
    window.ZoomChartsLicenseKey = "345b24c88605cdfa34a5bc681c42aac9b54851728097b0b013"+
        "7960735433eb2f5201f7c69f90dfba123f82cf59803f4f4ccbafedbd714d16af660b86c9053bd"+
        "403965dc5e013bdb8f9535fa278bd84d0affc07e4023b69d427f49eda6cae218b38bbe09835d7"+
        "a51f1c7e0a88128e0c074d1b2bf03aea9578508be3f6b0726defd9a06ba4cfc5b80dbceb259ac"+
        "c0ffe462666d784a482ace1b58938addf2ec178d384cc1b3a0a81280ae77265f5eb24b4375469"+
        "190937a5a218ea6225dd882e23683709148406505ab06bab34995e571aab75331910bb4b0798c"+
        "10006be5ac7f2834eab114085703bb029af9210c0ad8b512a4526b91693ff40844d4774c37831";

    export class Visual implements IVisual {
        private target: HTMLElement;
        private chart: ZoomCharts.FacetChart;
        private ZC: typeof ZoomCharts;
        private host: IVisualHost;
        private pendingData: ZoomCharts.Configuration.PieChartDataObjectRoot = { subvalues: [] };
        private pendingSettings: ZoomCharts.Configuration.FacetChartSettings = {};
        private updateTimer: number;
        private colors: IColorPalette;

        constructor(options: VisualConstructorOptions) {
            this.target = options.element;
            this.host = options.host;

            // if possible, use our own color palette because the default gets its colorIndex reset
            // to 0 when data changes. This results in the colors repeating as new 
            this.colors = this.host.colorPalette;
            
            if ((<any>extensibility).createColorPalette && (<any>this.colors).colors)
                this.colors = (<any>extensibility).createColorPalette((<any>this.colors).colors);

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

            this.chart = new zc.FacetChart({
                container: chartContainer,
                data:
                [{
                    preloaded: this.pendingData,
                }],
                info: {
                    valueFormatterFunction: (values, series) => {
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
                    onSelectionChange: (e, args) => this.updateSelection(args, 200),
                    onChartUpdate: (e, args) => {
                        if (args.origin === "user")
                            this.updateSelection(args, 500);
                    }
                },
                toolbar: {
                    export: false
                },
                assetsUrlBase: ZoomChartsLoader.RootUrl + "assets/"
            });

            this.chart.replaceSettings(this.pendingSettings);

            this.pendingSettings = null;
            this.pendingData = null;
        }

        private createSeries(options: VisualUpdateOptions) {
            let dataView = options.dataViews[0];
            if (!dataView || !dataView.categorical)
                return;

            let values = dataView.categorical.values;
            if (!values || !values.length)
                return;

            let series: ZoomCharts.Configuration.FacetChartSettingsSeriesColumns[] = [];
            for (let i = 0; i < values.length; i++) {
                let column = values[i];
                let istr = i.toFixed(0);
                let color = this.colors.getColor("zc-fc-color-" + istr);
                series.push({
                    type: "columns",
                    id: "s" + istr,
                    name: column.source.displayName,
                    extra: { format: column.source.format },
                    data: { field: i === 0 ? "value" : ("value" + istr) },
                    style: {
                        fillColor: color.value,
                        gradient: 0,
                    }
                });
            }

            let settings: ZoomCharts.Configuration.FacetChartSettings = {
                series: series,
                legend: { enabled: series.length > 1 },
            }

            if (this.chart) {
                this.chart.replaceSettings(settings);
            } else {
                this.pendingSettings = settings;
            }
        }

        private updateSelection(args: ZoomCharts.Configuration.FacetChartChartEventArguments, delay: number) {
            if (this.updateTimer) window.clearTimeout(this.updateTimer);
            let selman = this.host.createSelectionManager();
            let selectedSlices = (args.selection || []).map(o => o.data);
            if (!selectedSlices.length && args.facet.id) {
                selectedSlices = args.facet.data.values;
            }

            window.setTimeout(() => {
                if (selectedSlices.length) {
                    let sel: visuals.ISelectionId[] = [];
                    for (let i = 0; i < selectedSlices.length; i++) {
                        sel = sel.concat(selectedSlices[i].extra);
                    }
                    selman.select(sel, false);
                } else {
                    selman.clear();
                }
            }, delay);
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
            if (options.type & VisualUpdateType.Data) {
                this.createSeries(options);
                let root = Data.convert(this.host, this.target, options);
                if (this.chart) {
                    this.chart.replaceData(root);
                    this.chart.home();
                } else {
                    this.pendingData = root;
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