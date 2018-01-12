module powerbi.extensibility.visual {

    window.ZoomChartsLicense = "ZCP-u34517j50: ZoomCharts Custom Visual free licence for use in Microsoft PowerBI Projects ";
    window.ZoomChartsLicenseKey = "6611cc38dd379865f5c6d04671dfb30f79cb57af7e4df4ea21"+
    "42383b44a2a112636ca17c9c729a43841f2a55a16d267a395af10fe35763e409772292b18898e"+
    "206bcaf353b9ae266bfdcd2c113c3c5973683118c643c870526f3e48e34616f0558b33a03e34b"+
    "2402e051b887e0bbb9124e2a8de657ce512d7fe3c26d93b25b8a1774de7c00703156a5fb7d5eb"+
    "cd97a40cabdc2ab45d75fb94466ce7882b813649a7f148ae6997fe214d91df8b408fe2b678177"+
    "af7b709d6b0754c89dd01ef3e424c02c16dd7ae9162c8a9fe50307233bc6a07a0c63c09b3e239"+
    "e128a4f5595ff692e5d89f0d68606f8aa2afabc84ba1ef3c6e37f3419feab69e8dcd8a0f0af7d";

    export class Visual implements IVisual {
        protected target: HTMLElement;
        protected chart: ZoomCharts.NetChart;
        protected ZC: typeof ZoomCharts;
        public host: IVisualHost;
        protected pendingData: ZoomCharts.Configuration.NetChartDataObject = {nodes:[], links: []};
        protected pendingClasses: Array<any>;
        protected updateTimer: number;
        protected formatString: string = "#,0.00";
        protected formatter: powerbi.extensibility.utils.formatting.IValueFormatter = null;
        protected selectionManager: ISelectionManager;
        protected lastCategorySet: string = null;
        protected zoom: number = 1;
        protected customPropertiesFree: any = [];
        public betalimitator: any = null;
        public customizationInformer: any = null;
        public viewport: any = null;
        public current_scale:any = 1;
        public prev_pixel_ratio:any = 1;
        public cached_color:any={};
        public cached_color_light:any={};
        public current_selection:any={};
        public is_paid: boolean = false;

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

            this.betalimitator = new betalimitator(this.target, this);
            //this.betalimitator.showBetaLogo();
            if(this.betalimitator.checkIfExpired()) {
                this.showExpired();
            }

            
            this.customizationInformer = new customiztionInformer(this.target, this, {
                url: "https://zoomcharts.com/en/microsoft-power-bi-custom-visuals/custom-visuals/advanced-network-chart/",
                images: {
                    "600x400": "https://cdn.zoomcharts-cloud.com/assets/power-bi/NC-600x400.png",
                    "500x500": "https://cdn.zoomcharts-cloud.com/assets/power-bi/NC-500x500.png",
                    "400x600": "https://cdn.zoomcharts-cloud.com/assets/power-bi/NC-400x600.png",
                    "300x200": "https://cdn.zoomcharts-cloud.com/assets/power-bi/NC-300x200.png",
                    "200x300": "https://cdn.zoomcharts-cloud.com/assets/power-bi/NC-200x300.png"
                }
            });
            this.customizationInformer.showGetFullVersionLogo();
            
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

            if(!this.pendingData.nodes.length) {
                displayMessage(this.target, "Please, select at least one category for node grouping", "Incorrect data", false);        
            }

            let chartContainer = document.createElement("div");
            chartContainer.className = this.is_paid ? "chart-container full-container" : "chart-container";
            this.target.appendChild(chartContainer);
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
                        this.current_selection = args.selection;
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
                        } else if (this.current_selection.length){
                            if (!this.cached_color_light[n.fillColor]){
                                let r:number = parseInt(n.fillColor.substr(1,2), 16);
                                let g:number = parseInt(n.fillColor.substr(3,2), 16);
                                let b:number = parseInt(n.fillColor.substr(5,2), 16);
                                this.cached_color_light[n.fillColor] = "rgba(" + [r,g,b].join(",") + ",0.5)";
                            }
                            n.fillColor = this.cached_color_light[n.fillColor];
                        }
                        if (!n.items.length){
                            n.items = [];
                            let label:string = "(empty)";
                            if (name){
                                label = name+"";
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
                            if (typeof(this.cached_color[n.fillColor]) == "undefined"){
                                let r:number = parseInt(n.fillColor.substr(1,2), 16)/255;
                                let g:number = parseInt(n.fillColor.substr(3,2), 16)/255;
                                let b:number = parseInt(n.fillColor.substr(5,2), 16)/255;
                                let i = r /3 + g/3 + b/3;
                                if (i < 0.4)
                                    color = "white";
                                this.cached_color[n.fillColor] = color;
                            } else {
                                color = this.cached_color[n.fillColor];
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
                    nodeDetailMinZoom: 0.05,
                    linkDetailMinSize: 20,
                    linkDetailMinZoom: 0.05
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
            updateSize(this, options.viewport);
            if (options.type & VisualUpdateType.Data) {
                
                let blob = Data.convert(this, this.host, this.target, options);
                let classes = blob.classes;
                let root:ZoomCharts.Configuration.NetChartDataObject = blob;
                if (blob.format != undefined)
                    this.formatString = blob.format;

                this.viewport = options.viewport;
                
                this.customPropertiesFree = options.dataViews[0].metadata.objects;

                if (this.chart) {
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
        public updateSelection(args: ZoomCharts.Configuration.NetChartChartEventArguments, delay: number) {
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

        @logExceptions()
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            const objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];

            switch (objectName) {
                case 'customization':
                    let val = getValue(this.customPropertiesFree, "customization", "show", null);

                    let isInfoVisible = this.customizationInformer.isDialogVisible();
                    if(val == true && !isInfoVisible && !this.customizationInformer.initialCheck) {
                        this.customizationInformer.hideDialog();
                        val = false;
                    } else if(val == true) {
                        this.customizationInformer.displayDialog();
                    } else {
                        this.customizationInformer.hideDialog();
                    }

                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            show: val
                        },
                        selector: null
                    });

            }
            return objectEnumeration;
            /*
            return [{
                objectName: objectName,
                properties: <any>vals,
                validValues: validValues,
                selector: null
            }];
            */
        }
    }
}
