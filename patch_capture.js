const fs = require('fs');
let p = 'src/app/(tabs)/capture/index.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace('colors={["#00b679", "#009e60"]}', 'colors={["#00bb7a", "#009e60"]}');
c = c.replace('end={{ x: 1, y: 0 }}', 'end={{ x: 1, y: 1 }}');
c = c.replace('backgroundColor: "#f8f9fa"', 'backgroundColor: "#f8fafc"');
c = c.replace('header: { paddingHorizontal: 18, paddingTop: 45, paddingBottom: 25, flexDirection: "row", alignItems: "center" }', 'header: { paddingHorizontal: 24, paddingTop: 45, paddingBottom: 25, flexDirection: "row", alignItems: "center", borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: "#009e60", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }');
c = c.replace('headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", flex: 1 }', 'headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800", flex: 1, letterSpacing: 0.3 }');

fs.writeFileSync(p, c);
console.log("Updated Capture file");
