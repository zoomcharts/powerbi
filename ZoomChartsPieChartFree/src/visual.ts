module powerbi.extensibility.visual {
    window.ZoomChartsLicense = "ZCF-981cwt0sy-8: ZoomCharts Custom Visual free licence for use in Microsoft PowerBI Projects (for PieChart); upgrades until: 2018-08-03"
    window.ZoomChartsLicenseKey = "a56064da9f189dd5f9fa3501972d45824138d4818efd560d7b"+
        "a2b3d4e808111fd4163e8cf53163fe411a3a25482942ee4a83f5d62206af48e301302d5e20bfd"+
        "a4eac0e919b2a6a9ac97245203d9061a54ea595adda00f32703b5f158e84fc546bd556b441683"+
        "992153f3a794224cf9d5dc1da638f058bc5ce3a03dd698f0daa1e338a73d930fb4d5d2c721c26"+
        "c154d17f63a4e8a3d22257852763e0254e1dd8d718dbda5fd43d9a267a1aed563d2ac3183aee9"+
        "1b5e8e1e148b858c4bc4c9509164a7ff5e7cc656e0d1f21c2bde535970d5a02f623fbfc5ec5b0"+
        "0d63b288945e3f5b077e541acd9c97f74ab78a9aba23098f87b69bcd0067f94ad4fb43eeaba1a";


    export class Visual implements IVisual {
        private target: HTMLElement;
        private chart: ZoomCharts.PieChart;
        private ZC: typeof ZoomCharts;
        private host: IVisualHost;
        private pendingData: ZoomCharts.Configuration.PieChartDataObjectRoot = { subvalues: [] };
        private updateTimer: number;
        private formatString: string = "#,0.00";
        private formatter: powerbi.extensibility.utils.formatting.IValueFormatter = null;
        private lastChartUpdatePieId = "";

        constructor(options: VisualConstructorOptions) {
            this.target = options.element;
            this.host = options.host;
            this.formatter = powerbi.extensibility.utils.formatting.valueFormatter.create({format: this.formatString});

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

            this.chart = new zc.PieChart({
                container: chartContainer,
                data:
                [{
                    preloaded: this.pendingData,
                    sortField: "value"
                }],
                toolbar: {enabled: true, export: true},
                info: {
                    contentsFunction: (data, slice) => {
                        let f = this.formatter;
                        if (!f) return "";
                        return data.name 
                        + " - " 
                        + f.format(data.value)
                        + " (" 
                        + slice.percent.toFixed(1) 
                        + "%)";
                    }
                },
                interaction: {
                    resizing: { enabled: false }
                },
                events: {
                    onClick: (e, args) => {
                        if ((e.ctrlKey || e.shiftKey) && args.clickSlice && args.clickSlice.id === null)
                            e.preventDefault();
                    },
                    onSelectionChange: (e, args) => this.updateSelection(args, 200),
                    onChartUpdate: (e, args) => {
                        if (args.origin === "user" && args.pie.id !== this.lastChartUpdatePieId) {
                            this.lastChartUpdatePieId = args.pie.id;
                            this.updateSelection(args, 500);
                        }
                    }
                },
                assetsUrlBase: ZoomChartsLoader.RootUrl + "assets/"
            });

            this.pendingData = null;
        }

        private updateSelection(args: ZoomCharts.Configuration.PieChartChartEventArguments, delay: number) {
            if (this.updateTimer) window.clearTimeout(this.updateTimer);

            let selman = this.host.createSelectionManager();
            let selectedSlices = (args.selection || []).map(o => o.data);
            if (!selectedSlices.length && args.pie.id) {
                selectedSlices = args.pie.data.values;
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
            let root = Data.convert(this.host, this.target, options);

            if (root.subvalues.length) {
                this.formatString = options.dataViews[0].categorical.values[0].source.format;
                this.formatter = powerbi.extensibility.utils.formatting.valueFormatter.create({format: this.formatString});
            }

            if (this.chart) {
                this.chart.replaceData(root);
                this.chart.home();
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