module powerbi.extensibility.visual {

    window.ZoomChartsLicense = "ZCP-x44w85tze: PBI NetChart beta";
    window.ZoomChartsLicenseKey ="81fed9d10b8e900f71b5c84ec456ee93683523b726b3c8afb8"+
    "abf51404bba5b7e627838ec33d836f53cb7cce74d0be787c7910da554f06bc234ccac0da3e03b"+
    "fb21f3168e8e711e9b5aec212d97b5120faaa6795bcd3e39ad87f94df02e759b78031fe69c29b"+
    "db5273a0010dc5c5c099e1389d38183f8a9d58809766f18b348612ac13f6dd5530d44cb1ed68e"+
    "ac3357c7dea9206b23b14323ec70b541de600723e67c2f8f53eedaf5955481b880554c72f9ddd"+
    "a7c9dfa4f6907378ba0714ee9172ed6fee042be5393995ba22ab4834170c274da040d6b50b21f"+
    "02a90b5e80fc79debcd7a737972ade37284104c8d3db9c7a86252ab4b986a8ea0c0b928c4aed4";

    export class Visual implements IVisual {
        protected target: HTMLElement;
        protected chart: ZoomCharts.NetChart;
        protected ZC: typeof ZoomCharts;
        protected host: IVisualHost;
        protected pendingData: ZoomCharts.Configuration.NetChartDataObject = {nodes:[], links: []};
        protected pendingClasses: Array<any>;
        protected updateTimer: number;
        protected formatString: string = "#,0.00";
        protected formatter: powerbi.extensibility.utils.formatting.IValueFormatter = null;
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

            this.chart = new zc.NetChart({
                container: chartContainer,
                data:
                [{
                    preloaded: this.pendingData
                }],
                interaction: {
                    resizing: { enabled: false }
                },
                events: {
                    onClick: (e, args) => {
                    },
                    onChartUpdate: (e, args) => {
                    },
                    onSelectionChange: (e, args) => this.updateSelection(args, 200)
                },
                style: {
                    nodeStyleFunction: (n) => {
                        let name = n.data.extra.name
                        if (name !== null){
                            n.label = name;
                        } else {
                            n.label = "(empty)";
                        }
                        n.radius = Math.log(n.data.extra.value)*10+10;
                        n.items = [{
                            px: 0,
                            py: 0,
                            text: ""+(Math.round(n.data.extra.value*100)/100),
                            textStyle: {
                                font: Math.round(n.radius/4) + "px Arial"
                            },
                            scaleWithZoom: true
                        }];
                    },
                    linkHovered: {
                        shadowBlur: 0,
                        fillColor: "red"
                    },
                    nodeClasses: this.pendingClasses
                },
                legend: {
                    enabled: true
                },
                assetsUrlBase: ZoomChartsLoader.RootUrl + "assets/"
            });

            this.pendingData = null;
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
            if (options.type & VisualUpdateType.Data) {
                let blob = Data.convert(this.host, this.target, options);
                let classes = blob.classes;
                let root:ZoomCharts.Configuration.NetChartDataObject = blob;

                let tempViewport: any = options.viewport;
                let tmpScale = 0;
                let scale: any = null;
                if (tempViewport.scale){
                    tmpScale = tempViewport.scale;
                    if(tmpScale == 1) {
                        scale = true;
                    } else if(tmpScale > 0 && tmpScale < 1) {
                        scale = tmpScale * 2;
                    } else if(tmpScale > 1) {
                        if(window.devicePixelRatio) {
                            scale = tmpScale * window.devicePixelRatio;
                        } else if(window.window.devicePixelRatio) {
                            scale = tmpScale * window.window.devicePixelRatio;
                        } else {
                            scale = tmpScale * 1;
                        }
                    }
                }

                if (this.chart) {

                    if (scale !== null){
                        this.chart.replaceSettings({
                            advanced: {
                                highDPI: scale
                            }
                        });
                    }
                    
                    this.chart.updateSettings({style:{nodeClasses: classes}});
                    
                    this.chart.replaceData(root);

                    this.pendingData = root;
                } else {
                    this.pendingClasses = classes;
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
        private updateSelection(args: ZoomCharts.Configuration.NetChartChartEventArguments, delay: number) {
            if (this.updateTimer) window.clearTimeout(this.updateTimer);

            let selman = this.selectionManager;
            let selectedSlices = (args.selection || []).map(o => o.data);

            window.setTimeout(() => {
                if (selectedSlices.length) {
                    let sel: visuals.ISelectionId[] = [];
                    for (let i = 0; i < selectedSlices.length; i++) {
                        sel = sel.concat(selectedSlices[i].extra.selectionId);
                    }

                    let cursel = selman.getSelectionIds();
                    if (!arraysEqual(cursel, sel, (a: any, b: any) => a.key === b.key)) {
                        selman.clear();
                        selman.select(sel, false);
                    }
                } else {
                    selman.clear();
                }
            }, delay);
        }
    }
}
