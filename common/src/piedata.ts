module powerbi.extensibility.visual {
    export class Data {
        public static convert(host: IVisualHost, options: VisualUpdateOptions) {
            let root: ZoomCharts.Configuration.PieChartDataObjectRoot = {
                id: "",
                subvalues: [],
                extra: []
            };

            let dataView = options.dataViews[0];
            if (!dataView) {
                console.warn("No data received");
                return root;
            }

            if (!dataView.categorical) {
                console.warn("non-categorical data retrieved");
                return root;
            }

            if (!dataView.categorical.categories) {
                console.warn("no category field selected");
                return root;
            }

            if (!dataView.categorical.values) {
                console.warn("no value field selected");
                return root;
            }

            let values = dataView.categorical.values[0].values;

            let catCount = dataView.categorical.categories.length;
            let ids: Array<visuals.ISelectionId> = new Array(values.length);
            let parentObjects: Array<ZoomCharts.Configuration.PieChartDataObject> = new Array(values.length);
            let grouper: ZoomCharts.Dictionary<ZoomCharts.Configuration.PieChartDataObject>;
            for (let i = 0; i < values.length; i++) {
                parentObjects[i] = <any>root;
                ids[i] = host.createSelectionIdBuilder().withCategory(dataView.categorical.categories[0], i).createSelectionId();
            }

            for (let c = 0; c < catCount; c++) {
                let expandable = c < catCount - 1;
                let categories = dataView.categorical.categories[c];
                grouper = Object.create(null);
                for (let i = 0; i < values.length; i++) {
                    let parent = parentObjects[i];
                    let idVal = parent.id + "\ufdd0" + categories.values[i];

                    let obj = grouper[idVal];
                    if (!obj) {
                        //console.log(categories.values[i], idVal);
                        obj = {
                            value: <number>values[i],
                            name: "" + categories.values[i],
                            id: idVal,
                            subvalues: [],
                            style: {
                                expandable: expandable,
                                fillColor: host.colorPalette.getColor(ids[i].getKey()).value
                            },
                            extra: [ids[i]]
                        };
                        parent.value += <number>values[i] || 0;
                        parent.subvalues.push(obj);
                        grouper[idVal] = obj;
                    } else {
                        obj.extra.push(ids[i]);
                        obj.value += <number>values[i] || 0;
                    }

                    // support for multiples values (in FacetChart)
                    for (let v = 1; v < dataView.categorical.values.length; v++) {
                        let aValues = dataView.categorical.values[v];
                        let k = "value" + v.toFixed(0);
                        if (!obj[k])
                            obj[k] = <number>aValues.values[i] || 0;
                        else
                            obj[k] += <number>aValues.values[i] || 0;
                    }

                    parentObjects[i] = obj;
                }
            }
            return root;
        }
    }
}