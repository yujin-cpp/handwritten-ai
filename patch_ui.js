const fs = require('fs');

function replaceAll(str, mapObj) {
    let re = new RegExp(Object.keys(mapObj).join("|"), "gi");
    return str.replace(re, function(matched){
        return mapObj[matched.toLowerCase()] || mapObj[matched];
    });
}

function processClassesTab() {
  let p = 'src/app/(tabs)/classes/index.tsx';
  let c = fs.readFileSync(p, 'utf8');
  
  c = c.replace('["#00b679", "#009e60"]', '["#00bb7a", "#009e60"]');
  c = c.replace('end={{ x: 1, y: 0 }}', 'end={{ x: 1, y: 1 }}');
  c = c.replace('backgroundColor: "#fff"', 'backgroundColor: "#f8fafc"');
  c = c.replace('borderRadius: CARD_RADIUS,', 'borderRadius: 20,');
  c = c.replace('shadowColor: "#000",', 'shadowColor: "#64748b",');
  c = c.replace('Elevation: 2,', 'elevation: 3,');
  c = c.replace('opacity: 0.07,', 'opacity: 0.08,');
  c = c.replace('borderWidth: 1.3,', 'borderWidth: 2, borderStyle: "dashed",');
  c = c.replace('borderColor: "#0EA47A",', 'borderColor: "#e2e8f0",');
  c = c.replace('paddingTop: 45,\r\n    paddingBottom: 22,\r\n    flexDirection: "row",\r\n    alignItems: "center",', 'paddingTop: 45,\r\n    paddingBottom: 22,\r\n    flexDirection: "row",\r\n    alignItems: "center",\r\n    borderBottomLeftRadius: 24,\r\n    borderBottomRightRadius: 24,');
  c = c.replace('paddingTop: 45,\n    paddingBottom: 22,\n    flexDirection: "row",\n    alignItems: "center",', 'paddingTop: 45,\n    paddingBottom: 22,\n    flexDirection: "row",\n    alignItems: "center",\n    borderBottomLeftRadius: 24,\n    borderBottomRightRadius: 24,');

  fs.writeFileSync(p, c);
}

function processAnalyticsTab() {
  let p = 'src/app/(tabs)/analytics/index.tsx';
  let c = fs.readFileSync(p, 'utf8');

  c = c.replace('["#00b679", "#008a5b"]', '["#00bb7a", "#009e60"]');
  // Handle start and end by adding them into the LinearGradient tag, or just replace the tag directly if we know it exactly.
  c = c.replace(
      'colors={["#00bb7a", "#009e60"]} style={[styles.header, { paddingTop: insets.top + 15 }]}', 
      'colors={["#00bb7a", "#009e60"]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.header, { paddingTop: insets.top + 15 }]}'
  );
  
  c = c.replace('backgroundColor: "#f8f9fa"', 'backgroundColor: "#f8fafc"');
  
  c = c.replace('paddingBottom: 25 }', 'paddingBottom: 25, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: "#009e60", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }');
  
  fs.writeFileSync(p, c);
}

processClassesTab();
processAnalyticsTab();
console.log("Replaced successfully");
