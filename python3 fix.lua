with open("src/app/NVMFinance.jsx") as f:
    c = f.read()
c = c.replace("[process.env.NEXT](http://process.env.NEXT)_PUBLIC_SUPABASE_URL", "process.env.NEXT_PUBLIC_SUPABASE_URL")
c = c.replace("[process.env.NEXT](http://process.env.NEXT)_PUBLIC_SUPABASE_ANON_KEY", "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY")
with open("src/app/NVMFinance.jsx", "w") as f:
    f.write(c)
print("OK")