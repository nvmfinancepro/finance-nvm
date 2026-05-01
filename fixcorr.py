with open("src/app/NVMFinance.jsx") as f:
    c = f.read()
c = c.replace("![i.id](http://i.id)||[i.id](http://i.id)>999999999", 
"!i.id||i.id>999999999")
with open("src/app/NVMFinance.jsx","w") as f:
    f.write(c)
print("OK")
