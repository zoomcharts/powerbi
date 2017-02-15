module powerbi.extensibility.visual {
    export class Data {
        public static convert(host: IVisualHost, target: HTMLElement, options: VisualUpdateOptions) {
            let root: ZoomCharts.Configuration.TimeChartDataObject = {
                from: 0,
                to: 1,
                unit: "d",
                values: [],
            };
            let ids: Array<visuals.ISelectionId>;

            let dataView = options.dataViews[0];
            if (!dataView) {
                displayMessage(target, "Please select the data fields for the visual.", "Incorrect data", false);
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

            let convValues = new Array<[number[]]>(times.length);
            for (let i = 0; i < times.length; i++) {
                let x = new Array<number>(valueCat.length + 2);
                x[x.length - 1] = i;
                let d = <Date>times[i];
                if (!d) continue;

                if (!d.getSeconds) {
                    displayMessage(target, "Please select a Date/Time field for the visual. The currently selected field does not contain the correct data type.", "Incorrect date", false);
                    return {data: root, ids:ids};
                }

                if (d.getSeconds() !== 0) hasSeconds = true;
                if (d.getMinutes() !== 0) hasMinutes = true;
                if (d.getHours() !== 0) hasHours = true;
                if (d.getDate() !== 1) hasDays = true;
                if (d.getMonth() !== 1) hasMonths = true;

                x[0] = d.valueOf();

                for (let v = 0; v < valueCat.length; v++) {
                    let aValues = valueCat[v];
                    x[v + 1] = <number>aValues.values[i] || 0;
                }

                root.values.push(x);
            }

            if (!hasSeconds && !hasMinutes && !hasHours) {
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

            root.unit = hasSeconds ? "s" : hasMinutes ? "m" : hasHours ? "h" : hasDays ? "d" : hasMonths ? "M" : "y";
            root.from = root.dataLimitFrom = root.values[0][0];
            root.to = root.dataLimitTo = <number> root.values[root.values.length - 1][0] + 1;
            return {data: root, ids: ids };
        }
    }
}