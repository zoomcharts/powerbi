module powerbi.extensibility.visual {
    export class Data {
        public static convert(visual: Visual, host: IVisualHost, target: HTMLElement, options: VisualUpdateOptions) {
            if (isDebugVisual) {
                console.log("Chart data update called", options);
            }

            let root: ZoomCharts.Configuration.TimeChartDataObject = {
                from: 0,
                to: 1,
                dataLimitFrom: 0,
                dataLimitTo: 1,
                unit: "d",
                values: [],
            };
            let ids: Array<visuals.ISelectionId>;

            let dataView = options.dataViews[0];
            if (!dataView) {
                displayMessage(target, "Either the data loading is taking longer than usual or the data fields for the visual are not properly configured.", "Incorrect data", false);
                return {data: root, ids: ids };
            }

            if (!dataView.categorical) {
                displayMessage(target, "The visual did not receive categorical data.", "Incorrect data", false);
                return {data: root, ids: ids };
            }

            if (!dataView.categorical.categories) {
                displayMessage(target, "Please select the `Date` field for the visual.", "Incorrect data", false);
                return {data: root, ids: ids };
            }

            if (!dataView.categorical.categories[0].source.type.dateTime) {
                displayMessage(target, "Please select a Date/Time field for the visual. The currently selected field does not contain the correct data type.", "Incorrect data", false);
                return {data: root, ids:ids};
            }

            if (!dataView.categorical.values) {
                displayMessage(target, "Please select at least one value field for the visual.", "Incorrect data", false);
                return {data: root, ids: ids };
            }

            hideMessage(target);

            let timeCat = dataView.categorical.categories[0];
            let times = timeCat.values;
            let valueCat = dataView.categorical.values;
            ids = new Array(times.length);

            for (let i = 0; i < times.length; i++) {
                ids[i] = host.createSelectionIdBuilder().withCategory(timeCat, i).createSelectionId();
            }

            let hasSeconds = false;
            let hasMinutes = false;
            let hasHours = false;
            let hasDays = false;
            let hasMonths = false;
            let hasMilliseconds = false;

            let convValues = new Array<[number[]]>(times.length);
            for (let i = 0; i < times.length; i++) {
                let x = new Array<number>(valueCat.length + 2);
                x[x.length - 1] = i;

                let raw = times[i];
                if (raw == null){
                    /* skip nulls */
                    continue;
                }

                let d: Date = new Date(times[i]);

                if (isNaN(d.valueOf())) {
                    displayMessage(target, "Please select a Date/Time field for the visual. The currently selected field does not contain the correct data type.", "Incorrect data", false);
                    return {data: root, ids:ids};
                }

                times[i] = d;

                if (d.getMilliseconds() !== 0) hasMilliseconds = true;
                if (d.getSeconds() !== 0) hasSeconds = true;
                if (d.getMinutes() !== 0) hasMinutes = true;
                if (d.getHours() !== 0) hasHours = true;
                if (d.getDate() !== 1) hasDays = true;
                if (d.getMonth() !== 1) hasMonths = true;

                x[0] = d.valueOf();

                for (let v = 0; v < valueCat.length; v++) {
                    let aValues = valueCat[v];

                    let vvv = aValues.values[i];
                    if (vvv != null && typeof vvv !== "number") {
                        displayMessage(target, "Please select a numerical field as the value for the visual or change the aggregation of it to `Count`. The problematic value is `" + aValues.values[i] + "` from the field `" + aValues.source.displayName.replace(/</g, "<") + "`", "Incorrect data", false);
                        return {data: root, ids: ids };
                    }

                    x[v + 1] = <number>vvv;
                }

                root.values.push(x);
            }

            if (!hasMilliseconds && !hasSeconds && !hasMinutes && !hasHours) {
                // normalize to UTC as the dates are given in the local timezone
                let ii = 0;
                for (let i = 0; i < times.length; i++) {
                    let d = <Date>times[i];
                    if (!d) continue;
                    root.values[ii][0] = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
                    ii++;
                }
            }

            root.values.sort((a,b) => <number>a[0] - <number>b[0]);

            root.unit = hasMilliseconds ? "ms" : hasSeconds ? "s" : hasMinutes ? "m" : hasHours ? "h" : hasDays ? "d" : hasMonths ? "M" : "y";
            root.from = root.dataLimitFrom = root.values[0][0];
            root.to = root.dataLimitTo = <number> root.values[root.values.length - 1][0] + 1;
            if (isDebugVisual) {
                console.log(root);
            }
            return {data: root, ids: ids };
        }
    }
}
