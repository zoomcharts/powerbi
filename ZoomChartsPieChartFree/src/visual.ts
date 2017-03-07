module powerbi.extensibility.visual {
    window.ZoomChartsLicense = "ZCF-f4y674wxg-8: ZoomCharts Custom Visual free licence for use in Microsoft PowerBI Projects (for PieChart); upgrades until: 2017-05-01";
    window.ZoomChartsLicenseKey = "be9357d72091338cff0145d5b12b87ba3d511b29f6fed86413"+
        "f17dc59592463b4796192d2db752d2f5ea9523ea48f49b53d9e04d5b6ca98e9f2872727d7663a"+
        "0fcfe5098e5a04081daab0651b0c2edc89ea07fd5150ac193d768cc920921c7530de6ac1a8428"+
        "5ba9f31df7e2cae6be374940c33248e6c64458d6183ab7578cc2d0235d6e1eae0bbb4bb275f06"+
        "31ec2c40918cf25cb35d3698731b5662374b2ded48ad83b059978487f4e668c6d811f1f026dad"+
        "3a436ea9cce4ebdb0943d40a0be37286ecc38f311795002eba8ae0aca984b4d96c86e6fa096bc"+
        "58926b8e273f645662ea35021fa6f87788462803d1a09f97a5293ffaa9cfa9a5e81bd3ff1a073";

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