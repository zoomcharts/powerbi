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
        protected zoom: number = 1;
        public betalimitator: any = null;
        public viewport: any = null;

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

            this.betalimitator = new betalimitator(this.target);
            this.betalimitator.showBetaLogo();
            if(this.betalimitator.checkIfExpired()) {
                this.showExpired();
            }
        }
        public showExpired(){
            let title = "This was a beta version of the Net Chart and time is up!";
            let message = "We appreciate your feedback on your experience and what you'd like us to improve. The feedback form is available on your ZoomCharts account page.";
            this.betalimitator.displayBetaExpiredMessage(this.target, message, title, false);
        }
        public updateTimeout:number = 0;
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
            self.updateTimeout = null;
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
                    onPositionChange: (e, args) => {
                        self.zoom = self.chart.zoom();
                        if (self.updateTimeout){
                            clearTimeout(self.updateTimeout);
                        }
                        self.updateTimeout = setTimeout(()=>{
                            self.chart.updateStyle();
                        },25);
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
                            l.radius = 20;
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
                            n.lineWidth = n.radius*0.3*self.zoom;
                        } else if (n.hovered){
                            n.lineColor = "rgba(0,0,0,0.5)";
                            n.lineWidth = n.radius*0.3*self.zoom;
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

        public rect:any=null;
        public current_scale:any=1;
        public prev_pixel_ratio:any;
        public updateSize(viewport){
            //console.log("it's the new version", viewport);
            let scale;
            if (typeof(viewport.scale) != "undefined"){
                scale = viewport.scale;
            } else {
                scale = this.current_scale;
            }

            //console.log("Current scale", scale);
            if (!this.prev_pixel_ratio){
                this.prev_pixel_ratio = window.devicePixelRatio;
            }
            if (window.devicePixelRatio != this.prev_pixel_ratio){
                //console.log("Pixel ratio chagne", viewport);
                this.prev_pixel_ratio = window.devicePixelRatio;
                this.current_scale = 1;
            }
            this.prev_pixel_ratio = 2;

            if (window.devicePixelRatio == 2){
                if (scale){
                    scale = this.current_scale = scale;
                } else {
                    scale = this.current_scale;
                }
                if (scale > 1){
                    scale = scale;// * window.devicePixelRatio;
                    let height = viewport.height;
                    let width = viewport.width;
                    let nh:any;
                    let nw:any;
                    this.target.style.height =(nh=Math.round(height * scale )) +"px";
                    this.target.style.width = (nw=Math.round(width * scale)) +"px";
                    this.target.style.marginTop = -Math.round((height - height * 1/scale)/2)*scale+"px";
                    this.target.style.marginLeft= -Math.round((width - width *1/scale)/2)*scale +"px"; 
                    let t:any;
                    this.target.style.transform = t="scale(" + 1/scale + "," + 1/scale + ")";
                    //console.log("retina", window.devicePixelRatio, width, height, scale, "New height",nh, "New widht", nw, "New transform", t);
                }
            } else {
                if (scale){
                    scale = this.current_scale = scale;
                } else {
                    scale = this.current_scale;
                }
                scale = scale;// * window.devicePixelRatio;
                if (scale > 1){
                    let height = viewport.height;
                    let width = viewport.width;
                    let nh:any;
                    let nw:any;
                    this.target.style.height =(nh=Math.round(height * scale )) +"px";
                    this.target.style.width = (nw=Math.round(width * scale)) +"px";
                    this.target.style.marginTop = -Math.round((height - height * 1/scale)/2*scale)+"px";
                    this.target.style.marginLeft= -Math.round((width - width *1/scale)/2*scale)+"px"; 
                    let t:any;
                    this.target.style.transform = t="scale(" + 1/scale + "," + 1/scale + ")";
                    //console.log("non retina", window.devicePixelRatio, width, height, scale, "New height",nh, "New widht", nw, "New transform", t);
                }
            }
        } 
        @logExceptions()
        public update(options: VisualUpdateOptions) {
            this.updateSize(options.viewport);
            if (options.type & VisualUpdateType.Data) {
                
                let blob = Data.convert(this, this.host, this.target, options);
                let classes = blob.classes;
                let root:ZoomCharts.Configuration.NetChartDataObject = blob;
                if (blob.format != undefined)
                    this.formatString = blob.format;


                if (this.chart) {
                    this.viewport = options.viewport;
                    updateScale(options, this.chart);
                    this.chart.updateSize();

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
