module powerbi.extensibility.visual {
    export class Visual implements IVisual {
        protected target: HTMLElement;
        protected chart: ZoomCharts.PieChart;
        protected ZC: any;
        public host: IVisualHost;
        protected pendingData: ZoomCharts.Configuration.PieChartDataObjectRoot = { subvalues: [] };
        protected updateTimer: number;
        protected formatString: string = "#,0.00";
        protected formatter: powerbi.extensibility.utils.formatting.IValueFormatter = null;
        protected lastChartUpdatePieId = "";
        protected selectionManager: ISelectionManager;
        protected lastCategorySet: string = null;
        protected customPropertiesFree: any = [];
        public customizationInformer: any = null;
        public viewport: any = null;
        constructor(options: VisualConstructorOptions) {
            version = "v1.1.0.1";
            releaseDate = "Oct 13, 2018";
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

            appendZCCss(this.target);
            if (visualMode == "free"){
                setupCustomizationInformer(this);
            }
            this.createChart(window);
            if (isDebugVisual){
                console.log("Chart added", this.chart);
            }
        }

        @logExceptions()
        protected createChart(zc:any, onBeforeCreate?: ((settings:any)=>any) ) {
            // check if the visual is destroyed before chart is created.
            if (!this.target)
                return;
            this.ZC = zc;

            let chartContainer = document.createElement("div");
            chartContainer.className = "chart-container";
            this.target.appendChild(chartContainer);

            let settings:any = {
                container: chartContainer,
                assetsUrlBase: "/",
                data:
                [{
                    preloaded: this.pendingData,
                    sortField: "value" 
                }],
                info: {
                    contentsFunction: (data, slice) => {
                        let f = this.formatter;
                        if (!f) return "";
                        return secureString(data.name)
                        + " - " 
                        + secureString(f.format(data.value))
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
                        handleCreditClick(this.host, e,args, "piechart");
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
            };
            if (visualMode == "free"){
                addFreeVersionLogo(settings);
            }
            if (onBeforeCreate){
                settings = onBeforeCreate(settings);
            }
            this.chart = new zc.PieChart(settings);
            hideMessage();
        }
        @logExceptions()
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
                res += "///" + secureString(c.source.queryName);
            }
            return res;
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
            updateSize(this, options.viewport, options.viewMode);
            if (visualMode == "free"){
                this.customizationInformer.updateImage(options.viewport);
            }
            if (options.type & VisualUpdateType.Data) {
                let root = Data.convert(this, this.host, this.target, options);
                let catStr = this.stringifyCategories(options.dataViews[0]);

                if (root.subvalues.length) {
                    this.formatString = options.dataViews[0].categorical.values[0].source.format;
                    this.formatter = powerbi.extensibility.utils.formatting.valueFormatter.create({format: this.formatString});
                }

                this.customPropertiesFree = options.dataViews[0].metadata.objects;

                if (this.chart) {
                    this.viewport = options.viewport;

                    this.chart.replaceData(root);

                    if (this.lastCategorySet !== catStr)
                        this.chart.setPie([""], 0);

                    this.pendingData = root;
                } else {
                    this.pendingData = root;
                }
                this.lastCategorySet = catStr;
            }
            this.chart.updateSettings({advanced:{highDPI: 2}});
            this.chart.updateSize();
        }

       // @logExceptions()
        public destroy(): void {
            this.target = null;
            if (this.chart) {
                this.chart.remove();
                this.chart = null;
            }
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
