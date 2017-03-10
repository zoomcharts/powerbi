module powerbi.extensibility.visual {
    window.ZoomChartsLicense = "ZCF-x33yuxzf8-1: ZoomCharts Custom Visual free licence for use in Microsoft PowerBI Projects (for FacetChart); upgrades until: 2018-03-08"
    window.ZoomChartsLicenseKey = "4d3a4d47a253044154dcc81b3970e97057e98542f68762a0d0"+
        "c5f065e2215d1fe11a000c36e4ae45cc3123a0a41fad4a72c7e80c20d62a6b616d3d740a7af16"+
        "78605d1b2f605266351e6ad4ba76d46a302729d8fab5ae5ac2aa5ee8aef72b01a67fa2a0d5178"+
        "0b399473aee9f077fbe8dc2fdff07676681917f731315452f6128eeae611c07173ad88133a838"+
        "a91ff41e50041d3652f26029d19d0b9732dcf704cdd7d00e9b8c70a339951ac25d0af23f25be9"+
        "4df5437f9ce6751f029e8204525f331da03848621da09ed9e1652735effd07a3013d4820086df"+
        "e9c4f0233be80bbbf2cd4d5ecdafad6331f6961035ae8959e6515d7686ddb97cfff9885657bd9";

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
                    this.chart.setPie("");
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