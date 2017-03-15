module powerbi.extensibility.visual {
    export class Data {
        private static palettes: ZoomCharts.Dictionary<ColorPaletteWrapper> = {};

        public static convert(host: IVisualHost, target: HTMLElement, options: VisualUpdateOptions) {
            if (isDebugVisual) {
                console.log("Chart data update called", options);
            }

            let root: ZoomCharts.Configuration.PieChartDataObjectRoot = {
                id: "",
                subvalues: [],
                extra: []
            };

            let dataView = options.dataViews[0];
            if (!dataView) {
                displayMessage(target, "Please select the data fields for the visual.", "Incorrect data", false);
                return root;
            }

            if (!dataView.categorical) {
                displayMessage(target, "The visual did not receive categorical data.", "Incorrect data", false);
                return root;
            }

            if (!dataView.categorical.categories) {
                displayMessage(target, "Please select the category field for the visual.", "Incorrect data", false);
                return root;
            }

            if (!dataView.categorical.values) {
                displayMessage(target, "Please select at least one value field for the visual.", "Incorrect data", false);
                return root;
            }

            hideMessage(target);

            const formatter = powerbi.extensibility.utils.formatting.formattingService;
            let values = dataView.categorical.values[0].highlights || dataView.categorical.values[0].values;

            let catCount = dataView.categorical.categories.length;
            let ids: Array<visuals.ISelectionId> = new Array(values.length);
            let parentObjects: Array<ZoomCharts.Configuration.PieChartDataObject> = new Array(values.length);
            let grouper: ZoomCharts.Dictionary<ZoomCharts.Configuration.PieChartDataObject>;
            for (let i = 0; i < values.length; i++) {
                parentObjects[i] = <any>root;
                ids[i] = host.createSelectionIdBuilder().withCategory(dataView.categorical.categories[0], i).createSelectionId();
            }

            if (catCount > 0) {
                root.name = dataView.categorical.categories[0].source.displayName;
            }

            for (let c = 0; c < catCount; c++) {
                let expandable = c < catCount - 1;
                let categories = dataView.categorical.categories[c];
                grouper = Object.create(null);

                let colorPalette = this.palettes[categories.source.queryName] || (this.palettes[categories.source.queryName] = new ColorPaletteWrapper(createColorPalette(host)));

                for (let i = 0; i < values.length; i++) {
                    let parent = parentObjects[i];
                    let catValue = formatter.formatValue(categories.values[i], categories.source.format);
                    let idVal = parent.id + "\ufdd0" + catValue;
                    let localId = categories.source.queryName + "\ufdd0" + catValue;

                    let obj = grouper[idVal];
                    if (!obj) {
                        let color = getColor(categories, i, "colors" + (c + 1).toFixed(0));
                        if (color) {
                            // reserve the color if "revert to default" is clicked.
                            colorPalette.getColor(localId);
                        } else {
                            color = colorPalette.getColor(localId);
                        }

                        obj = {
                            value: <number>values[i] || 0,
                            name: "" + catValue,
                            id: idVal,
                            subvalues: [],
                            style: {
                                expandable: expandable,
                                fillColor: color.value
                            },
                            extra: [ids[i]]
                        };
                        obj.extra.category = categories.source.queryName;
                        obj.extra.categoryName = categories.source.displayName;
                        parent.value += <number>values[i] || 0;
                        parent.subvalues.push(obj);
                        grouper[idVal] = obj;
                    } else {
                        obj.extra.push(ids[i]);
                        obj.value += <number>values[i] || 0;
                    }

                    // support for multiples values (in FacetChart)
                    for (let v = 1; v < dataView.categorical.values.length; v++) {
                        let aValues = dataView.categorical.values[v].highlights || dataView.categorical.values[v].values;
                        let k = "value" + v.toFixed(0);
                        if (!obj[k])
                            obj[k] = <number>aValues[i] || 0;
                        else
                            obj[k] += <number>aValues[i] || 0;
                    }

                    parentObjects[i] = obj;
                }
            }

            return root;
        }

        public static enumerateSlices(objectName: string, depth: number, parent: ZoomCharts.Configuration.PieChartDataObjectCommon, result: VisualObjectInstance[], seenKeys: ZoomCharts.Dictionary<boolean>) {
            if (!parent.subvalues)
                return;

            for (let v of parent.subvalues) {
                if (depth === 0) {
                    let key = v.extra.category + "/" + v.name;
                    if (seenKeys[key])
                        continue;
                    seenKeys[key] = true;

                    result.push({
                        objectName: objectName,
                        displayName: v.name,
                        properties: { fill: { solid: { color: v.style.fillColor } } },
                        selector: v.extra[0].getSelector()
                    });
                } else {
                    this.enumerateSlices(objectName, depth - 1, v, result, seenKeys);
                }
            }
        }
    }
    
}