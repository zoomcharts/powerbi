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
        protected target: HTMLElement;
        protected chart: ZoomCharts.PieChart;
        protected ZC: typeof ZoomCharts;
        protected host: IVisualHost;
        protected pendingData: ZoomCharts.Configuration.PieChartDataObjectRoot = { subvalues: [] };
        protected updateTimer: number;
        protected formatString: string = "#,0.00";
        protected formatter: powerbi.extensibility.utils.formatting.IValueFormatter = null;
        protected lastChartUpdatePieId = "";
        protected selectionManager: ISelectionManager;
        protected lastCategorySet: string = null;

        constructor(options: VisualConstructorOptions) {
            this.target = options.element;
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
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

        protected createChart(zc: typeof ZoomCharts) {
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

            //this.pendingData = null;
        }

        private updateSelection(args: ZoomCharts.Configuration.PieChartChartEventArguments, delay: number) {
            if (this.updateTimer) window.clearTimeout(this.updateTimer);

            let selman = this.selectionManager;
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
                    
                    let cursel = selman.getSelectionIds();
                    if (!arraysEqual(cursel, sel, (a: any, b: any) => a.key === b.key)) {
                        selman.clear();
                        selman.select(sel, false);
                    } else if (isDebugVisual) {
                        console.log("Selection not being updated because getSelectionIds() matches the requested selection. It is possible that the selection is not actually being applied in some cases because of what seems to be a bug in PowerBI.");
                    }
                } else {
                    selman.clear();
                }
            }, delay);
        }

        protected stringifyCategories(dataview: DataView) {
            if (!dataview) return null;
            if (!dataview.categorical || !dataview.categorical.categories) return null;

            let categories = dataview.categorical.categories;
            let res = "";
            for (let c of categories) {
                res += "///" + c.source.queryName;
            }
            return res;
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
            if (options.type & VisualUpdateType.Data) {
                let root = Data.convert(this.host, this.target, options);
                let catStr = this.stringifyCategories(options.dataViews[0]);

                if (root.subvalues.length) {
                    this.formatString = options.dataViews[0].categorical.values[0].source.format;
                    this.formatter = powerbi.extensibility.utils.formatting.valueFormatter.create({format: this.formatString});
                }

                if (this.chart) {
                    this.chart.replaceData(root);

                    if (this.lastCategorySet !== catStr)
                        this.chart.setPie([""], 0);

                    this.pendingData = root;
                } else {
                    this.pendingData = root;
                }
                this.lastCategorySet = catStr;
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