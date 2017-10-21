module powerbi.extensibility.visual {

    window.ZoomChartsLicense = "ZCS-m1g5c977u-4: ZoomCharts PowerBI NetChart Evaluation licence";
    window.ZoomChartsLicenseKey = "5316f1f2309bc62990da455ed27a427b00f0f41a9a50713a3b"+
    "8c115a1fb3c86ab1c7cd93aee1219154cf53988865ef0b960840374fe3f813b3ae744e4bb861c"+
    "1143ce03a5eb3b7fd6f2e4b1b8e70e843435567185c030f44701fec37c406fca92452a90283a8"+
    "e3439edd896b6c4f33e18fbace6f1dcf4085d6016f88df84765b0b185c5bb2285d42d900e2eda"+
    "d8a354da0218cf864cbe09ed6a43a4a1050ef010303234a27db5e6a4573a7dd787d8c3d7a326f"+
    "f447350443bec006ac0343f28d89f65496934e83f53d9a821455377c9d679fb3b3eeac598873c"+
    "3038a62255bdcea5dfc81f016015fc6953c91c1893f3b3b41e5e0fd8c5446af9993ab9ae89340";

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
                    }
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
    }
}
