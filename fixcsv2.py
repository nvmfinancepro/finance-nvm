with open("src/app/NVMFinance.jsx") as f:
    c = f.read()

old = """      if(patch.imports) {
        const newImports = 
patch.imports.filter(i=>!i.id||i.id>999999999);
        for(const imp of newImports) {
          await supabase.from("imports_csv").upsert({
            
client_id:id,type:imp.type,label:imp.label,mois:imp.mois,
            
rows:imp.rows,count:imp.count,imported_at:imp.importedAt,
          },{onConflict:"client_id,type,mois"});
        }
      }"""

new = """      if(patch.imports) {
        for(const imp of patch.imports) {
          await supabase.from("imports_csv").upsert({
            
client_id:id,type:imp.type,label:imp.label,mois:imp.mois,
            
rows:imp.rows,count:imp.count,imported_at:imp.importedAt,
          },{onConflict:"client_id,type,mois"});
        }
      }"""

c = c.replace(old,new)
with open("src/app/NVMFinance.jsx","w") as f:
    f.write(c)
print("OK")
