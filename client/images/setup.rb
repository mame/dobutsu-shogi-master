SIZE = 150

Dir.chdir(__dir__)

def download(url)
  f = File.basename(url)
  return f if File.readable?(f)
  system("wget", "-q", url)
  f
end

def sq(i, o, size, extent = size)
  size = "%dx%d" % [size, size] unless size.is_a?(String)
  extent = "%dx%d" % [extent, extent] unless extent.is_a?(String)
  system("convert", "-gravity", "center", i, "-resize", size, "-background", "transparent", "-extent", extent, o)
  o
end

def arrow(f, arrow, n)
  8.times do |m|
    next if n[m] == 0
    dir = %w(north northwest west southwest south southeast east northeast)[m]
    system("convert", arrow, "-background", "rgba(0,0,0,0)", "-rotate", (m * -45).to_s, "tmp.png")
    system("convert", f, "tmp.png", "-gravity", dir, "-composite", f)
  end
  f
end

def rotate(f)
  rf = "r-" + f
  system("convert", f, "-rotate", "180", rf)
  rf
end

def opt(o)
  system("optipng", "-fix", "-i0", "-o7", "-strip", "all", o) || raise
  system("advdef", "-z4", o) || raise
  system("advpng", "-z4", o) || raise
end

arrow = sq(download("http://1.bp.blogspot.com/-Lj5NbsMLENk/UZMs1iWA56I/AAAAAAAASIo/f5HL7seBZYQ/s800/fabric_mark_triangle.png"), "arrow.png", SIZE * 0.1)
pieces = [
  # ライオン
  download("http://1.bp.blogspot.com/-xduqITkDHU8/VJF_JMAj0BI/AAAAAAAApzU/dDJ3JhEBYLc/s800/animalface_lion.png"),
  # ぞう
  download("http://1.bp.blogspot.com/-VajTyQJ-VbY/VJF_SPLgX8I/AAAAAAAAp1I/EJvTFuqti-g/s800/animalface_zou.png"),
  # キリン
  download("http://4.bp.blogspot.com/-xG8K2ssXVjs/VJ6W2ZzvVAI/AAAAAAAAqAk/v5Y3etU_HBo/s800/animalface_kirin.png"),
  # ひよこ
  download("http://1.bp.blogspot.com/--c0K8UbKthw/USSkrgcx9EI/AAAAAAAANWI/wSq7qttn9Lg/s1600/hiyoko.png"),
  # にわとり
  download("http://2.bp.blogspot.com/-fhkRCjjEO98/VJF_LkOt_bI/AAAAAAAApzs/jYqrTFF6XA4/s800/animalface_niwatori.png"),
].map.with_index {|f, i| sq(f, "piece%d.png" % i, SIZE * 0.8, SIZE) }
pieces.each_with_index do |f, i|
  dir = [0b11111111, 0b10101010, 0b01010101, 0b00000001, 0b11010111][i]
  arrow(f, arrow, dir)
  system("cp", f, "n-" + f)
  system("convert", "+append", f, rotate(f), f)
end

# 人工知能
ai = sq(download("http://4.bp.blogspot.com/-Anllqq6pDXw/VRUSesbvyAI/AAAAAAAAsrc/CIHz6vLsuTU/s800/computer_jinkou_chinou.png"), "ai.png", SIZE)
system("convert", "ai.png", "-modulate", "130", "ai2.png")
system("convert", "+append", ai, "ai2.png", ai)

faces = [
  # 普通 (78-70)
  download("http://1.bp.blogspot.com/-DC5nNC4usfM/VZ-O2ZIgKQI/AAAAAAAAu98/LSxkiFZm1r4/s300/boy03_smile.png"),
  # 考える (68-50)
  download("http://2.bp.blogspot.com/-15TVWXOmEls/VZ-PLtSR0vI/AAAAAAAAvCc/_Jvd0fgFfCs/s300/boy_think.png"),
  # 驚く (48-30)
  download("http://1.bp.blogspot.com/-I4mxosJiITM/VZ-PJGgCoWI/AAAAAAAAvB8/HAQbVKWTKjI/s300/boy_idea.png"),
  # 震える (28-10)
  download("http://3.bp.blogspot.com/-eHbOsQvlMqg/VZ-PKUoFOBI/AAAAAAAAvCE/LjW60S46TWc/s300/boy_shock.png"),
  # 焦る (8-2)
  download("http://2.bp.blogspot.com/-FUtTfORbaFI/VZ-PLKq5iFI/AAAAAAAAvCU/CN9CKxWOB6A/s300/boy_surprise.png"),
  # 泣く (0)
  download("http://1.bp.blogspot.com/-JvWLzDT99Bo/VZ-O2WKmgII/AAAAAAAAu90/uFNjFQlG7vw/s300/boy04_cry.png"),
].map.with_index {|f, i| sq(f, "face%d.png" % i, SIZE) }.each_slice(2).map do |f1, f2|
  system("convert", "+append", f1, f2, f1)
  f1
end
system("convert", "-append", *(pieces + [ai] + faces), "sprites.png")

abouts = [
  download("http://2.bp.blogspot.com/--RIb-pd-Kdg/WFtH6Um3jmI/AAAAAAABAmQ/wRiSA1kKc8MBYEaEonmSbwB2UZAaiwhwACLcB/s800/ai_kenka.png"),
  download("http://2.bp.blogspot.com/-Vo_Zg1TcAz8/V5NDnu2l8WI/AAAAAAAA8dQ/bVr8Ybi7k9oSX8MH0Af9Kvv5MzW-ccwJQCLcB/s800/ai_pet_family.png"),
].map.with_index {|f, i| sq(f, "about%d.png" % i, "%dx%d" % [SIZE * 2, SIZE * 1.6]) }
system("convert", "-append", "sprites.png", *abouts, "sprites.png")

opt("sprites.png")

bg = download("http://1.bp.blogspot.com/-aC2jXDBJcuY/VpjBp16ShbI/AAAAAAAA25w/pL6seXQvsM0/s1600/bg_natural_sougen.jpg")
File.binwrite("bg.jpg", File.binread(bg))
