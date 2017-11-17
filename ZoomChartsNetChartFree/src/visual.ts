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
        protected zoom: number = 1;

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
            function formatText(value:any){
                let s = Math.round(value) + "";
                let l = s.length;
                let m = {"3": "k", "6": "m", "9":"b", "12": "t"};
                let max:any = 1;
                for (let x in m){
                    if (m.hasOwnProperty(x)){
                        let ki:number = parseInt(x);
                        if (s.length > ki){
                            max = Math.max(max, ki);
                        }
                    }
                }
                let v:string;
                if (l){
                    v = Math.round(value / Math.pow(10, max)*10)/10 + m[max+""];
                } else {
                    v = Math.round(value * 10)/10 +"";
                }
                return v;
            }
            let cached_color:any={};
            let cached_color_light:any={};
            let current_selection:any=[];
            let self = this;
            self.zoom = 1;
            this.chart = new zc.NetChart({
                container: chartContainer,
                data:
                [{
                    preloaded: this.pendingData
                }],
                interaction: {
                    resizing: { enabled: false },
                    zooming: {
                        autoZoomPositionElasticity: 2.5e-6
                    }
                },
                events: {
                    onClick: (e, args) => {
                        if (args.clickNode){
                            e.preventDefault();
                            return false;
                        }
                    },
                    onChartUpdate: (e, args) => {
                        self.zoom = self.chart.zoom();
                    },
                    onSelectionChange: (e, args) => {
                        current_selection = args.selection;
                        self.updateSelection(args, 200);
                        self.chart.updateStyle();
                    }
                },
                style: {
                    nodeSelected: {
                        shadowBlur: null,
                        shadowColor: null
                    },
                    nodeHovered: {
                        shadowBlur: null,
                        shadowColor: null
                    },
                    linkStyleFunction: (l) => {
                        l.shadowBlur = null;
                        l.shadowColor = null;
                        if (l.from.selected || l.to.selected){
                            l.radius = 5;
                            l.fillColor = "black";
                        }
                    },
                    linkHovered: {
                        radius: 5,
                        fillColor: "rgba(0,0,0,0.5)"
                    },
                    selection: {
                        shadowBlur: null,
                        shadowColor: null
                    },
                    nodeStyleFunction: (n) => {
                        let name = n.data.extra.name;
                        n.label = null;
						n.radius = n.data.extra.radius;

                        n.lineColor = null;
                        n.shadowBlur = null;
                        n.shadowColor = null;

                        if (n.selected){
                            n.lineColor = "black";
                            n.lineWidth = n.radius*0.20*self.zoom;
                        } else if (n.hovered){
                            n.lineColor = "rgba(0,0,0,0.5)";
                            n.lineWidth = n.radius*0.20*self.zoom;
                        } else if (current_selection.length){
                            if (!cached_color_light[n.fillColor]){
                                let r:number = parseInt(n.fillColor.substr(1,2), 16);
                                let g:number = parseInt(n.fillColor.substr(3,2), 16);
                                let b:number = parseInt(n.fillColor.substr(5,2), 16);
                                cached_color_light[n.fillColor] = "rgba(" + [r,g,b].join(",") + ",0.5)";
                            }
                            n.fillColor = cached_color_light[n.fillColor];
                        }
                        if (!n.items.length){
                            n.items = [];
                            let label:string = "(empty)";
                            if (name){
                                label = name;
                            }
                            n.items.push({
                                px: 0,
                                py: 1.33,
                                text: secureString(label),
                                textStyle: {
                                    fillColor: "black",
                                    font: Math.round(n.radius/2) + "px Arial"
                                },
                                backgroundStyle: {
                                    fillColor: "rgba(255,255,255,0.5)"
                                },
                                scaleWithZoom: true,
                                hoverEffect: false
                            });
                            let color:string = "black";
                            if (typeof(cached_color[n.fillColor]) == "undefined"){
                                let r:number = parseInt(n.fillColor.substr(1,2), 16)/255;
                                let g:number = parseInt(n.fillColor.substr(3,2), 16)/255;
                                let b:number = parseInt(n.fillColor.substr(5,2), 16)/255;
                                let i = r /3 + g/3 + b/3;
                                if (i < 0.4)
                                    color = "white";
                                cached_color[n.fillColor] = color;
                            } else {
                                color = cached_color[n.fillColor];
                            }
                            n.items.push({
                                px: 0,
                                py: 0,
                                text: ""+(formatText(Math.round(n.data.extra.value*100)/100)),
                                textStyle: {
                                    fillColor: color,
                                    font: Math.round(n.radius/2) + "px Arial"
                                },
                                backgroundStyle: {
                                    fillColor: null
                                },
                                scaleWithZoom: true,
                                hoverEffect: false
                            });
                        }
                    },
                    link: {
                        shadowBlur: null,
                        shadowColor: null
                    },
                    nodeClasses: this.pendingClasses,
                    nodeDetailMinSize: 20,
                    nodeDetailMinZoom: 0.05
                },
                legend: {
                    enabled: true
                },
                toolbar: {
                    fullscreen: false
                },
                nodeMenu: {
                    buttons: [
                        "btn:hide", "btn:collapse", "btn:expand"
                    ],
                    contentsFunction: (data:any, node:any, callback:any)=>{
                        let val:string = "";
                        val = "Name: " + secureString(data.extra.name) + "<br>";
                        val += "Value: " + powerbi.extensibility.utils.formatting.valueFormatter.format(
                            data.extra.value,
                            self.formatString);
                        callback(val);
                        return val;
                    }
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
                if (blob.format != undefined)
                    this.formatString = blob.format;

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
                    let l = selectedSlices.length;
                    for (let i = 0; i < l; i++) {
                        if (typeof(selectedSlices[i].extra) == "undefined")
                            continue;
                        if (typeof(selectedSlices[i].extra.selectionIds) == "undefined")
                            continue;
                        let sid = selectedSlices[i].extra.selectionIds;
                        let slen = sid.length;
                        sel = sel.concat(sid);
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
