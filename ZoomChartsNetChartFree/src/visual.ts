module powerbi.extensibility.visual {

    export class Visual implements IVisual {
        protected target: HTMLElement;
        protected chart: ZoomCharts.NetChart;
        protected ZC: any;
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
        public customizationInformer: any = null;
        public viewport: any = null;
        public current_scale:any = 1;
        public prev_pixel_ratio:any = null;
        public cached_color:any={};
        public cached_color_light:any={};
        public current_selection:any={};
        public is_paid: boolean = false;
        private prevClasses:any = [];
        private classUpdateTimeout:any = null;

        private st:any=null; // scrollIntoView timeout

        constructor(options: VisualConstructorOptions) {

            version = "v1.1.0.1";
            releaseDate = "Oct 16, 2018";
            visualType = "advanced-net-chart";
            visualName = "Advanced Network Chart Visual";

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

            displayMessage(this.target, "ZoomCharts Power BI Custom Visual", "Loading. Please wait.");

            /* net chart sprite and css */
            let netchart_sprite = "url(data:image/png;base64," + "iVBORw0KGgoAAAANSUhEUgAAABMAAAFOCAYAAABkNyZRAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA4RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo3ZjdhYmNlYi1kY2Y0LTI4NDMtYWVjMC05MzUxNjlmMjI1NTUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTlCNTk1QTI5OUM3MTFFNkFDOEFFMjEyQUNBQUQ3ODQiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTlCNTk1QTE5OUM3MTFFNkFDOEFFMjEyQUNBQUQ3ODQiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Zjk1OGQ5OWYtZmJhMi1iMjQwLWJhZTEtOWY4YmUwNzZlMmMyIiBzdFJlZjpkb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6MzJhNDAxNDgtOTVkYy0xMWU2LWIzMTct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" + ")";

            appendZCCss(this.target, netchart_sprite);

            if (visualMode == "free"){
                setupCustomizationInformer(this);
            }

            this.createChart(window);

            hideMessage();

            
        }
        public updateTimeout:number = 0;

        @logExceptions()
        protected createChart(zc:any, onBeforeCreate?: (settings:any)=>any ){
            // check if the visual is destroyed before chart is created.
            if (!this.target)
                return;

            this.ZC = zc;

            let chartContainer = document.createElement("div");
            chartContainer.className = "chart-container";
            this.target.appendChild(chartContainer);
            let self = this;
            self.zoom = 1;
            self.updateTimeout = null;

            let mode:ZoomCharts.Configuration.NetChartSettingsLayout = {
                //mode: "hierarchy",
                //nodeSpacing: 100
                mode: "dynamic",
            };
            let defaultNetChartSettings = {
                container: chartContainer,
                credits: {},
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
                        handleCreditClick(this.host, e,args, "netchart");
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
                    },
                    onDataUpdated: (e, args) => {
                        if (self.st){
                            clearTimeout(self.st);
                        }
                        self.st = setTimeout(()=>{
                            let nodeList = [];
                            var d = args.chart.exportData(true, false);
                            for (let x = 0; x < d.nodes.length; x++){
                                nodeList.push(d.nodes[x].id);
                            }
                            args.chart.scrollIntoView(nodeList);
                        }, 1000);
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
                    fullscreen: false,
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
                layout: mode,
                assetsUrlBase: "/"
            };
            if (visualMode == "free"){
                addFreeVersionLogo(defaultNetChartSettings);
            }
            if (onBeforeCreate){
                defaultNetChartSettings = onBeforeCreate(defaultNetChartSettings);
            }
            this.chart = new zc.NetChart(defaultNetChartSettings);
        }


        @logExceptions()
        public update(options: VisualUpdateOptions) {
            updateSize(this, options.viewport, options.viewMode);
            if (visualMode == "free"){
                this.customizationInformer.updateImage(options.viewport);
            }
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

                    if (this.classUpdateTimeout){
                        clearTimeout(this.classUpdateTimeout);
                    }

                    if (!this.prevClasses || this.prevClasses.length < classes.length){
                        this.chart.updateSettings({style:{nodeClasses: classes}});
                        this.chart.replaceData(root);
                    } else {
                        this.chart.replaceData(root);
                        let self = this;
                        this.classUpdateTimeout = setTimeout(()=>{self.chart.updateSettings({style:{nodeClasses: classes}});}, 2000);
                    }
                    this.prevClasses = classes;
                    this.pendingData = root;
                } else {
                    this.pendingClasses = classes;
                    this.pendingData = root;
                }
            }
            this.chart.updateSettings({advanced:{highDPI: 2}});
            this.chart.updateSize();
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
