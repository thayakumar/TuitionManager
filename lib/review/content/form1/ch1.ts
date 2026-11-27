import type { Checkpoint } from "@/lib/review/types";

export const misconceptions: Record<string, string> = {
  "ct-decomp-vs-abs":
    "Keliru antara teknik leraian (memecahkan masalah besar kepada bahagian kecil) dengan teknik peniskalaan (meninggalkan perkara tidak penting).",
  "ct-pattern-vs-gen":
    "Keliru antara teknik pengecaman corak (mengesan persamaan/corak berulang) dengan teknik pengitlakan (membina model, peraturan atau formula umum).",
  "ct-keeps-irrelevant":
    "Mengekalkan butiran luaran atau hiasan yang tidak penting (jenama, warna, corak) dan bukannya memberi tumpuan kepada aspek penting.",
  "ct-drops-essential":
    "Meninggalkan aspek penting atau kekangan utama (bajet, had masa, keselamatan atau ukuran) semasa memudahkan masalah.",
  "ct-step-order":
    "Menyusun langkah pelaksanaan sebelum langkah persediaan atau input prasyarat semasa menentukan langkah secara tertib.",
  "ct-linear-vs-diff":
    "Tersilap membaca pola perubahan sebutan berturutan (menambah beza tetap sedangkan nilai beza sebenarnya berubah, atau sebaliknya).",
  "ct-surface-similarity":
    "Memadankan masalah berdasarkan cerita luaran (objek yang sama) dan bukannya ciri-ciri kesamaan pada struktur matematik atau logik.",
  "ct-formula-offset":
    "Membina formula umum yang hanya betul bagi n = 1 tanpa menyemak kes n = 2 dan n = 3 (ralat pemalar dalam pengitlakan).",
};

export const checkpoints: Checkpoint[] = [
  {
    id: "f1-1.1.1",
    code: "1.1.1",
    title: "Teknik dalam Pemikiran Komputasional",
    titleMs: "Teknik dalam Pemikiran Komputasional",
    game: "match-up",
    objective:
      "Membezakan empat teknik asas pemikiran komputasional (leraian, pengecaman corak, peniskalaan dan pengitlakan) dalam pelbagai situasi harian.",
    draw: 7,
    items: [
      {
        id: "f1-1.1.1-q01",
        kind: "match",
        skill: "recall",
        prompt: "Padankan setiap teknik pemikiran komputasional dengan maksudnya mengikut buku teks KSSM ASK.",
        pairs: [
          { id: "p1", left: "Teknik Leraian", right: "Memecahkan masalah kompleks kepada bahagian-bahagian kecil" },
          { id: "p2", left: "Teknik Pengecaman Corak", right: "Mengenal pasti persamaan atau corak berulang antara masalah" },
          { id: "p3", left: "Teknik Peniskalaan", right: "Menumpukan aspek penting dan meninggalkan perkara tidak penting" },
          { id: "p4", left: "Teknik Pengitlakan", right: "Membina model, peraturan atau formula bagi menyelesaikan masalah serupa" },
        ],
        explanation:
          "Empat teknik asas pemikiran komputasional bergerak seiring: pecahkan masalah (leraian), kesan persamaan (pengecaman corak), tapis perkara penting (peniskalaan), dan bina model penyelesaian (pengitlakan).",
      },
      {
        id: "f1-1.1.1-q02",
        kind: "match",
        skill: "apply",
        prompt: "Jawatankuasa pengawas sedang menganjurkan Hari Kantin Sekolah. Padankan setiap tindakan berikut dengan teknik yang digunakan.",
        pairs: [
          { id: "p1", left: "Membahagikan tugas kepada AJK gerai makanan, kupon, kebersihan dan pentas", right: "Teknik Leraian" },
          { id: "p2", left: "Menyedari makanan bergoreng sentiasa habis terjual sebelum pukul 10:00 pagi sejak 3 tahun lalu", right: "Teknik Pengecaman Corak" },
          { id: "p3", left: "Mengabaikan warna alas meja semasa mengira keuntungan gerai", right: "Teknik Peniskalaan" },
          { id: "p4", left: "Menulis formula keuntungan: Untung = Jumlah Kupon − Kos Bahan Mentah", right: "Teknik Pengitlakan" },
        ],
        explanation:
          "Pembahagian tugasan ialah leraian; mengesan trend jualan tahunan ialah pengecaman corak; mengabaikan hiasan semasa pengiraan untung ialah peniskalaan; membina formula umum ialah pengitlakan.",
      },
      {
        id: "f1-1.1.1-q03",
        kind: "match",
        skill: "understand",
        prompt: "Berdasarkan masalah binaan anak tangga batu bata dalam buku teks (Rajah 1.2), padankan setiap langkah dengan tekniknya.",
        pairs: [
          { id: "p1", left: "Mengira bilangan batu bata mengikut setiap lapisan anak tangga secara berasingan", right: "Teknik Leraian" },
          { id: "p2", left: "Memerhatikan setiap lapisan anak tangga bertambah sebanyak bilangan batu bata yang tetap", right: "Teknik Pengecaman Corak" },
          { id: "p3", left: "Memberi tumpuan pada bilangan anak tangga dan lebarnya serta mengabaikan warna bata", right: "Teknik Peniskalaan" },
          { id: "p4", left: "Membina satu formula bagi mengira jumlah batu bata untuk sebarang n anak tangga", right: "Teknik Pengitlakan" },
        ],
        explanation:
          "Masalah binaan anak tangga dalam buku teks menunjukkan keempat-empat teknik pemikiran komputasional daripada memecahkan lapisan tangga hinggalah membentuk formula umum.",
      },
      {
        id: "f1-1.1.1-q04",
        kind: "match",
        skill: "apply",
        prompt: "Padankan setiap tindakan merancang perjalanan menaiki pengangkutan awam ke kelas tambahan dengan teknik pemikiran komputasional yang betul.",
        pairs: [
          { id: "p1", left: "Memecahkan perjalanan kepada berjalan kaki → LRT → bas pengantara", right: "Teknik Leraian" },
          { id: "p2", left: "Mengesan jalan utama sentiasa sesak setiap hari bekerja pada pukul 5:30 petang", right: "Teknik Pengecaman Corak" },
          { id: "p3", left: "Menyemak tambang dan masa ketibaan sambil mengabaikan corak iklan pada badan bas", right: "Teknik Peniskalaan" },
          { id: "p4", left: "Menetapkan peraturan: bertolak 45 minit awal setiap kali hari hujan", right: "Teknik Pengitlakan" },
        ],
        explanation:
          "Setiap peringkat perancangan perjalanan harian menggunakan teknik leraian, pengecaman corak, peniskalaan dan pengitlakan.",
      },
      {
        id: "f1-1.1.1-q05",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Aiman hendak membakar 60 biji kek cawan untuk majlis kesyukuran. Dia mengabaikan corak kartun pada cawan kertas dan hanya menumpukan saiz dulang ketuhar, masa membakar serta isi padu adunan. Apakah teknik yang digunakan oleh Aiman?",
        options: [
          { id: "a", text: "Teknik Peniskalaan" },
          { id: "b", text: "Teknik Leraian", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Teknik Pengecaman Corak" },
          { id: "d", text: "Teknik Pengitlakan" },
        ],
        answer: "a",
        explanation:
          "Meninggalkan perkara tidak penting (corak kartun cawan kertas) dan menumpukan aspek penting sahaja ialah teknik peniskalaan.",
      },
      {
        id: "f1-1.1.1-q06",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Selepas mengira bilangan batu bata bagi tangga 3 tingkat, 4 tingkat dan 5 tingkat, Mei Ling menulis formula `Jumlah = n × (n + 1) / 2` supaya sesiapa sahaja boleh mengira batu bata bagi 20 anak tangga dengan segera. Apakah teknik pada langkah akhir ini?",
        options: [
          { id: "a", text: "Teknik Pengitlakan" },
          { id: "b", text: "Teknik Pengecaman Corak", misconception: "ct-pattern-vs-gen" },
          { id: "c", text: "Teknik Leraian" },
          { id: "d", text: "Teknik Peniskalaan" },
        ],
        answer: "a",
        explanation:
          "Mengesan pola pertambahan 1 + 2 + 3… ialah pengecaman corak, manakala membina formula atau model umum yang boleh diguna semula ialah pengitlakan.",
      },
      {
        id: "f1-1.1.1-q07",
        kind: "match",
        skill: "apply",
        prompt: "Seorang doktor memeriksa pesakit demam denggi di klinik kesihatan. Padankan setiap tindakan dengan teknik pemikiran komputasional.",
        pairs: [
          { id: "p1", left: "Memeriksa gejala secara berasingan: suhu demam, bacaan platelet, ruam dan sakit sendi", right: "Teknik Leraian" },
          { id: "p2", left: "Mengesan 6 orang pesakit dari taman perumahan yang sama menunjukkan gejala serupa", right: "Teknik Pengecaman Corak" },
          { id: "p3", left: "Mengabaikan warna baju yang dipakai oleh pesakit ke klinik", right: "Teknik Peniskalaan" },
          { id: "p4", left: "Menyediakan senarai semak piawai bagi saringan kes disyaki denggi", right: "Teknik Pengitlakan" },
        ],
        explanation:
          "Pemikiran komputasional digunakan merentas bidang termasuk perubatan melalui leraian gejala, pengecaman corak kes, peniskalaan maklumat dan protokol piawai.",
      },
      {
        id: "f1-1.1.1-q08",
        kind: "mcq",
        skill: "understand",
        prompt: "Mengapakah teknik leraian dilakukan TERLEBIH DAHULU sebelum menyelesaikan sesuatu masalah yang besar?",
        options: [
          { id: "a", text: "Bahagian-bahagian kecil lebih mudah difahami, diteliti dan diselesaikan secara berasingan" },
          { id: "b", text: "Teknik ini memadamkan semua pemboleh ubah yang tidak penting secara automatik", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Teknik ini terus menghasilkan formula matematik tanpa perlu menyemak corak", misconception: "ct-pattern-vs-gen" },
          { id: "d", text: "Komputer tidak dapat menjalankan atur cara yang melebihi 10 baris" },
        ],
        answer: "a",
        explanation:
          "Teknik leraian memecahkan masalah atau sistem yang kompleks kepada bahagian-bahagian kecil supaya lebih mudah difahami dan diselesaikan.",
      },
      {
        id: "f1-1.1.1-q09",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Cikgu Farah membahagikan penghasilan majalah sekolah kepada 4 pasukan: penulisan artikel, fotografi, reka letak halaman dan percetakan. Apakah teknik yang digunakan oleh beliau?",
        options: [
          { id: "a", text: "Teknik Leraian" },
          { id: "b", text: "Teknik Peniskalaan", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Teknik Pengitlakan" },
          { id: "d", text: "Teknik Pengecaman Corak" },
        ],
        answer: "a",
        explanation: "Memecahkan satu projek besar kepada empat bahagian tugasan yang lebih kecil ialah teknik leraian.",
      },
      {
        id: "f1-1.1.1-q10",
        kind: "match",
        skill: "understand",
        prompt: "Padankan setiap soalan panduan kendiri berikut dengan teknik pemikiran komputasional yang berkaitan.",
        pairs: [
          { id: "p1", left: "“Bolehkah tugasan besar ini dipecahkan kepada bahagian-bahagian kecil?”", right: "Teknik Leraian" },
          { id: "p2", left: "“Apakah persamaan atau corak yang berulang dalam situasi ini?”", right: "Teknik Pengecaman Corak" },
          { id: "p3", left: "“Apakah aspek penting yang perlu dikekalkan dan perkara tidak penting yang boleh ditinggalkan?”", right: "Teknik Peniskalaan" },
          { id: "p4", left: "“Bolehkah saya membina satu model atau formula umum bagi masalah serupa?”", right: "Teknik Pengitlakan" },
        ],
        explanation: "Empat soalan panduan ini membantu murid memilih teknik pemikiran komputasional yang tepat semasa menjawab soalan penyelesaian masalah.",
      },
    ],
  },
  {
    id: "f1-1.1.2",
    code: "1.1.2",
    title: "Penggunaan Teknik Leraian dan Menentukan Langkah Secara Tertib",
    titleMs: "Penggunaan Teknik Leraian dan Menentukan Langkah Secara Tertib",
    game: "rank-order",
    objective:
      "Meleraikan sesuatu tugasan kepada bahagian kecil dan menyusun langkah penyelesaian secara tertib.",
    draw: 7,
    items: [
      {
        id: "f1-1.1.2-q01",
        kind: "order",
        skill: "apply",
        prompt: "Susun langkah menyediakan nasi goreng yang telah dileraikan ini mengikut urutan secara tertib.",
        steps: [
          { id: "s1", text: "Sediakan bahan-bahan: nasi sejuk, bawang putih, sebiji telur dan perencah" },
          { id: "s2", text: "Panaskan minyak di dalam kuali dan tumis bawang putih sehingga wangi" },
          { id: "s3", text: "Pecahkan telur ke dalam kuali dan kacau sehingga masak" },
          { id: "s4", text: "Masukkan nasi sejuk serta perencah, kemudian gaul sehingga sekata" },
          { id: "s5", text: "Padamkan api dapur dan hidangkan nasi goreng di atas pinggan" },
        ],
        misconception: "ct-step-order",
        explanation: "Bahan mesti disediakan dahulu sebelum menumis, diikuti telur dan nasi, dan akhir sekali memadamkan api serta menghidang.",
      },
      {
        id: "f1-1.1.2-q02",
        kind: "order",
        skill: "apply",
        prompt: "Susun langkah membeli tiket tren di mesin kios KTM Komuter secara tertib.",
        steps: [
          { id: "s1", text: "Pilih stesen destinasi dan bilangan penumpang pada skrin" },
          { id: "s2", text: "Semak jumlah tambang yang dipaparkan" },
          { id: "s3", text: "Buat bayaran menggunakan wang tunai atau kad pembayaran" },
          { id: "s4", text: "Ambil token perjalanan serta baki wang (jika ada)" },
          { id: "s5", text: "Sentuh token pada pintu pagar automatik untuk masuk ke platform" },
        ],
        misconception: "ct-step-order",
        explanation: "Jumlah tambang bergantung pada destinasi dan bilangan penumpang; bayaran perlu dibuat sebelum token dikeluarkan dan digunakan di pintu pagar.",
      },
      {
        id: "f1-1.1.2-q03",
        kind: "order",
        skill: "analyse",
        prompt: "Susun langkah secara tertib bagi mengira jumlah kos mengecat dinding bilik darjah berbentuk segi empat tepat (terdapat sebuah pintu yang tidak dicat).",
        steps: [
          { id: "s1", text: "Ukur panjang dan tinggi dinding serta lebar dan tinggi pintu" },
          { id: "s2", text: "Kira jumlah luas keseluruhan dinding (panjang × tinggi)" },
          { id: "s3", text: "Kira luas pintu dan tolak daripada luas dinding untuk memperoleh luas bersih" },
          { id: "s4", text: "Bahagikan luas bersih dengan keluasan liputan satu tin cat (bundarkan ke atas kepada tin penuh)" },
          { id: "s5", text: "Darabkan bilangan tin cat yang diperlukan dengan harga setin cat" },
        ],
        misconception: "ct-step-order",
        explanation: "Melalui teknik leraian, pengiraan dipecahkan secara tertib: ukuran → luas kasar → luas bersih → bilangan tin cat → jumlah kos.",
      },
      {
        id: "f1-1.1.2-q04",
        kind: "order",
        skill: "apply",
        prompt: "Susun langkah meminjam buku di Pusat Sumber Sekolah secara tertib.",
        steps: [
          { id: "s1", text: "Cari buku di rak atau melalui katalog dan pilih buku yang dikehendaki" },
          { id: "s2", text: "Serahkan kad pusat sumber murid bersama buku kepada pengawas bertugas" },
          { id: "s3", text: "Imbas kod bar kad murid dan kod bar buku ke dalam sistem" },
          { id: "s4", text: "Rekod atau cop tarikh pemulangan buku" },
          { id: "s5", text: "Ambil semula buku dan kad pusat sumber sebelum keluar" },
        ],
        misconception: "ct-step-order",
        explanation: "Buku dan kad peminjam perlu diserahkan dan diimbas terlebih dahulu sebelum tarikh pemulangan direkodkan.",
      },
      {
        id: "f1-1.1.2-q05",
        kind: "order",
        skill: "analyse",
        prompt: "Susun empat proses pemikiran komputasional mengikut urutan dalam Rajah 1.1 buku teks.",
        steps: [
          { id: "s1", text: "Masalah dipecahkan kepada bahagian-bahagian yang lebih kecil (Leraian)" },
          { id: "s2", text: "Kenal pasti corak yang sama pada bahagian masalah (Pengecaman Corak)" },
          { id: "s3", text: "Perkara tidak penting ditinggalkan (Peniskalaan)" },
          { id: "s4", text: "Sediakan satu model penyelesaian masalah (Pengitlakan)" },
        ],
        misconception: "ct-step-order",
        explanation: "Mengikut Rajah 1.1 dalam buku teks: Masalah dipecahkan → Kenal pasti corak yang sama → Perkara tidak penting ditinggalkan → Sediakan satu model penyelesaian masalah.",
      },
      {
        id: "f1-1.1.2-q06",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Raju hendak mengira luas lantai dewan badminton yang berbentuk huruf L. Cara leraian manakah paling memudahkan pengiraan?",
        options: [
          { id: "a", text: "Memecahkan bentuk L kepada dua segi empat tepat yang tidak bertindih, kemudian menjumlahkan luas kedua-duanya" },
          { id: "b", text: "Mengagak purata lebar lantai dan mendarabkannya dengan dinding paling panjang", misconception: "ct-drops-essential" },
          { id: "c", text: "Mencatat warna cat lantai dan jenama mop terlebih dahulu", misconception: "ct-keeps-irrelevant" },
          { id: "d", text: "Memotong pelan lantai kepada 1,000 segi tiga kecil secara rawak" },
        ],
        answer: "a",
        explanation:
          "Teknik leraian yang baik memecahkan bentuk gabungan kepada dua segi empat tepat mudah yang tidak bertindih supaya rumus panjang × lebar dapat digunakan terus.",
      },
      {
        id: "f1-1.1.2-q07",
        kind: "order",
        skill: "apply",
        prompt: "Susun langkah mencuci kasut sekolah berwarna putih secara tertib.",
        steps: [
          { id: "s1", text: "Tanggalkan tali kasut dan ketuk kotoran atau pasir kering" },
          { id: "s2", text: "Basahkan kasut dan berus kotoran menggunakan sabun pencuci" },
          { id: "s3", text: "Bilas kasut dengan air bersih sehingga tiada kesan sabun" },
          { id: "s4", text: "Jemur kasut di tempat berangin sehingga kering" },
          { id: "s5", text: "Sapu kapur kasut setelah kering dan pasang semula tali kasut" },
        ],
        misconception: "ct-step-order",
        explanation: "Kapur kasut dan tali kasut hanya dipasang selepas kasut dicuci, dibilas dan dikeringkan sepenuhnya.",
      },
      {
        id: "f1-1.1.2-q08",
        kind: "mcq",
        skill: "understand",
        prompt: "Mengapakah langkah-langkah selepas teknik leraian mesti disusun 'secara tertib'?",
        options: [
          { id: "a", text: "Kerana langkah seterusnya sering bergantung pada hasil atau persediaan daripada langkah sebelumnya" },
          { id: "b", text: "Kerana susunan mengikut abjad menjadikan arahan lebih pendek" },
          { id: "c", text: "Urutan tidak pernah memberi kesan asalkan semua bahagian kecil disenaraikan", misconception: "ct-step-order" },
          { id: "d", text: "Hanya komputer memerlukan urutan tertib; manusia boleh melakukan langkah secara rawak", misconception: "ct-step-order" },
        ],
        answer: "a",
        explanation:
          "Sama ada dalam tugasan harian mahupun pengiraan matematik, melaksanakan sesuatu langkah sebelum input prasyaratnya sedia akan menghasilkan keputusan yang salah.",
      },
      {
        id: "f1-1.1.2-q09",
        kind: "order",
        skill: "apply",
        prompt: "Susun langkah menyemai anak pokok cili di dalam pasu secara tertib.",
        steps: [
          { id: "s1", text: "Isikan pasu dengan campuran tanah semaian dan buat lubang kecil di tengah" },
          { id: "s2", text: "Masukkan anak pokok cili dengan cermat ke dalam lubang tersebut" },
          { id: "s3", text: "Kambus bahagian akar dengan tanah dan padatkan secara perlahan" },
          { id: "s4", text: "Siram air secukupnya di sekeliling pangkal anak pokok" },
        ],
        misconception: "ct-step-order",
        explanation: "Tanah dimasukkan dahulu ke dalam pasu, diikuti meletakkan anak pokok, mengambus akar dan menyiram air.",
      },
      {
        id: "f1-1.1.2-q10",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Langkah Siti membancuh air Milo panas: (1) Tuang air panas ke dalam cawan, (2) Minum air Milo, (3) Masukkan 2 sudu serbuk Milo, (4) Kacau sehingga larut. Apakah kesilapan Siti?",
        options: [
          { id: "a", text: "Langkah (2) tidak mengikut tertib kerana diminum sebelum serbuk Milo dimasukkan dan dikacau" },
          { id: "b", text: "Siti terlupa menyatakan warna cawan yang digunakan", misconception: "ct-keeps-irrelevant" },
          { id: "c", text: "Tiada sebarang kesilapan kerana keempat-empat langkah kecil sudah ada", misconception: "ct-step-order" },
          { id: "d", text: "Siti tidak menulis persamaan algebra" },
        ],
        answer: "a",
        explanation: "Menyenaraikan semua bahagian kecil belum mencukupi — langkah (2) mesti diletakkan paling akhir selepas serbuk Milo dimasukkan dan dikacau.",
      },
    ],
  },
  {
    id: "f1-1.1.3",
    code: "1.1.3",
    title: "Pengecaman Corak dalam Sesuatu Situasi",
    titleMs: "Pengecaman Corak dalam Sesuatu Situasi",
    game: "odd-one-out",
    objective:
      "Mengesan unsur persamaan dan perbezaan bagi pengecaman corak nombor, bentuk serta situasi harian.",
    draw: 10,
    items: [
      {
        id: "f1-1.1.3-q01",
        kind: "mcq",
        skill: "analyse",
        prompt: "Tiga daripada jujukan nombor berikut mengikut pola 'darab 2 pada setiap langkah'. Manakah jujukan yang BERBEZA (ganjil)?",
        options: [
          { id: "a", text: "3, 6, 9, 12, 15" },
          { id: "b", text: "2, 4, 8, 16, 32" },
          { id: "c", text: "5, 10, 20, 40, 80" },
          { id: "d", text: "1, 2, 4, 8, 16" },
        ],
        answer: "a",
        explanation: "3, 6, 9, 12, 15 bertambah sebanyak 3 (+3) pada setiap sebutan, manakala tiga jujukan lain didarab 2 (×2).",
      },
      {
        id: "f1-1.1.3-q02",
        kind: "mcq",
        skill: "apply",
        prompt: "Perhatikan pola beza antara sebutan dalam jujukan ini: 2, 5, 10, 17, 26, ? Apakah nombor seterusnya?",
        options: [
          { id: "a", text: "37" },
          { id: "b", text: "35", misconception: "ct-linear-vs-diff" },
          { id: "c", text: "36", misconception: "ct-formula-offset" },
          { id: "d", text: "52" },
        ],
        answer: "a",
        explanation: "Beza antara sebutan ialah +3, +5, +7, +9 (nombor ganjil menaik 2). Beza seterusnya ialah +11, maka 26 + 11 = 37.",
      },
      {
        id: "f1-1.1.3-q03",
        kind: "mcq",
        skill: "analyse",
        prompt: "Bentuk manakah yang memecahkan corak dalam senarai ini: Segi empat sama (4), Pentagon (5), Heksagon (6), Bulatan, Oktagon (8)?",
        options: [
          { id: "a", text: "Bulatan — bentuk melengkung dan bukannya poligon bersisi lurus" },
          { id: "b", text: "Segi empat sama — mempunyai sisi yang sama panjang" },
          { id: "c", text: "Oktagon — 8 ialah nombor genap" },
          { id: "d", text: "Pentagon — 5 ialah nombor perdana" },
        ],
        answer: "a",
        explanation: "Semua bentuk lain ialah poligon bersisi lurus dan berbucu; bulatan tiada sisi lurus atau bucu.",
      },
      {
        id: "f1-1.1.3-q04",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Bas sekolah tiba di hentian Taman Melawati pada pukul 6:30 pagi, 6:45 pagi, 7:00 pagi dan 7:15 pagi. Jika corak ini berterusan, bilakah bas seterusnya akan tiba?",
        options: [
          { id: "a", text: "7:30 pagi" },
          { id: "b", text: "7:25 pagi", misconception: "ct-linear-vs-diff" },
          { id: "c", text: "7:45 pagi" },
          { id: "d", text: "8:00 pagi" },
        ],
        answer: "a",
        explanation: "Corak masa ketibaan bas ialah selang masa tetap 15 minit, maka 7:15 pagi + 15 minit = 7:30 pagi.",
      },
      {
        id: "f1-1.1.3-q05",
        kind: "mcq",
        skill: "analyse",
        prompt: "Tiga aktiviti berikut berkongsi corak rutin berjadual yang berulang. Aktiviti manakah yang BERBEZA?",
        options: [
          { id: "a", text: "Menukar tayar basikal yang pancit secara tiba-tiba di tepi jalan" },
          { id: "b", text: "Mengambil kehadiran murid setiap pagi pada pukul 7:40 pagi" },
          { id: "c", text: "Membunyikan loceng waktu rehat pada pukul 10:10 pagi setiap hari persekolahan" },
          { id: "d", text: "Membuat salinan sandaran komputer pusat sumber setiap hari Jumaat pukul 4:00 petang" },
        ],
        answer: "a",
        explanation: "Kehadiran kelas, loceng rehat dan salinan sandaran mingguan berlaku mengikut jadual berulang, manakala tayar pancit ialah kejadian luar jangka.",
      },
      {
        id: "f1-1.1.3-q06",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Susunan segi tiga batang mancis dalam satu baris: 1 segi tiga menggunakan 3 batang, 2 segi tiga bersambung menggunakan 5 batang, 3 segi tiga bersambung menggunakan 7 batang. Berapakah batang mancis bagi 5 segi tiga bersambung?",
        options: [
          { id: "a", text: "11" },
          { id: "b", text: "15", misconception: "ct-formula-offset" },
          { id: "c", text: "9", misconception: "ct-linear-vs-diff" },
          { id: "d", text: "10" },
        ],
        answer: "a",
        explanation: "Segi tiga pertama memerlukan 3 batang dan setiap segi tiga baharu berkongsi satu sisi (+2 batang): 3, 5, 7, 9, 11.",
      },
      {
        id: "f1-1.1.3-q07",
        kind: "mcq",
        skill: "analyse",
        prompt: "Kenal pasti kata laluan yang BERBEZA berdasarkan corak pembentukan aksaranya:",
        code: "A) Kucing42!\nB) Harimau19!\nC) Pelangi88!\nD) burung77?",
        options: [
          { id: "a", text: "D — bermula dengan huruf kecil dan berakhir dengan '?' bukannya Huruf Besar + 2 digit + '!'" },
          { id: "b", text: "A — perkataan 'Kucing' mempunyai 6 huruf", misconception: "ct-keeps-irrelevant" },
          { id: "c", text: "C — menggunakan digit berulang '88'" },
          { id: "d", text: "B — nombor '19' ialah nombor ganjil" },
        ],
        answer: "a",
        explanation: "Pilihan A, B dan C mengikut pola PerkataanHurufBesar + 2 digit + '!'; pilihan D melanggar huruf besar awal dan simbol penutup.",
      },
      {
        id: "f1-1.1.3-q08",
        kind: "multi",
        skill: "understand",
        prompt: "Pilih DUA pernyataan yang menerangkan sebab pengecaman corak membantu menyelesaikan masalah dengan lebih cepat.",
        options: [
          { id: "a", text: "Kaedah penyelesaian daripada masalah lepas yang serupa boleh diguna semula atau diubah suai" },
          { id: "b", text: "Pola yang berulang membolehkan kita meramal nilai seterusnya tanpa mengira dari awal" },
          { id: "c", text: "Kita tidak perlu lagi menyemak sama ada jawapan adalah logik atau tidak", misconception: "ct-drops-essential" },
          { id: "d", text: "Teknik ini memecahkan satu tugasan kepada jawatankuasa yang berbeza", misconception: "ct-decomp-vs-abs" },
        ],
        answer: ["a", "b"],
        explanation: "Mengesan unsur persamaan membolehkan strategi sedia ada digunakan semula dan memudahkan ramalan nilai seterusnya.",
      },
      {
        id: "f1-1.1.3-q09",
        kind: "mcq",
        skill: "analyse",
        prompt: "Satu nombor dalam senarai ini tersasar daripada corak sebenar: 1, 4, 9, 16, 24, 36, 49. Nombor manakah yang salah?",
        options: [
          { id: "a", text: "24 (sepatutnya 25 kerana coraknya ialah nombor kuasa dua sempurna n²)" },
          { id: "b", text: "9 (kerana nombor lain kelihatan genap)", misconception: "ct-surface-similarity" },
          { id: "c", text: "1 (kerana mempunyai satu digit sahaja)" },
          { id: "d", text: "49 (sepatutnya 48)", misconception: "ct-linear-vs-diff" },
        ],
        answer: "a",
        explanation: "1², 2², 3², 4², 5², 6², 7² menghasilkan 1, 4, 9, 16, 25, 36, 49 — maka 24 tidak mengikut pola nombor kuasa dua.",
      },
      {
        id: "f1-1.1.3-q10",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Jualan nasi lemak kantin selama dua minggu:\nIsnin 80, Selasa 55, Rabu 50, Khamis 55, Jumaat 90 | Isnin 82, Selasa 53, Rabu 52, Khamis 54, Jumaat ?\nApakah anggaran paling munasabah bagi hari Jumaat minggu kedua?",
        options: [
          { id: "a", text: "Sekitar 90 bungkus (jualan memuncak setiap hari Isnin dan Jumaat)" },
          { id: "b", text: "Sekitar 54 bungkus (sama seperti hari Khamis)", misconception: "ct-linear-vs-diff" },
          { id: "c", text: "Sekitar 20 bungkus" },
          { id: "d", text: "Tidak boleh diramal langsung daripada data lepas" },
        ],
        answer: "a",
        explanation: "Perbandingan Minggu 1 dan Minggu 2 menunjukkan corak kitaran mingguan: pertengahan minggu sekitar 50–55 bungkus dan hari Jumaat memuncak sekitar 90 bungkus.",
      },
      {
        id: "f1-1.1.3-q11",
        kind: "mcq",
        skill: "analyse",
        prompt: "Tiga situasi berikut berkongsi corak pengiraan yang SAMA (Jumlah = Kuantiti × Kadar Seunit). Situasi manakah yang BERBEZA?",
        options: [
          { id: "a", text: "Meneka warna kegemaran rakan sekelas" },
          { id: "b", text: "Caj elektrik = unit kWj digunakan × kadar tarif" },
          { id: "c", text: "Bayaran parkir = bilangan jam × RM2 sejam" },
          { id: "d", text: "Kos fotostat = bilangan muka surat × RM0.10 semuka" },
        ],
        answer: "a",
        explanation: "Pilihan B, C dan D mempunyai struktur pendaraban Kuantiti × Kadar Seunit, manakala meneka warna tidak mempunyai pola kadar tetap.",
      },
      {
        id: "f1-1.1.3-q12",
        kind: "mcq",
        skill: "apply",
        prompt: "Corak susunan manik pada rantai: Merah, Biru, Biru, Kuning, Merah, Biru, Biru, Kuning… Apakah warna manik ke-15?",
        options: [
          { id: "a", text: "Biru" },
          { id: "b", text: "Kuning", misconception: "ct-formula-offset" },
          { id: "c", text: "Merah", misconception: "ct-formula-offset" },
          { id: "d", text: "Hijau" },
        ],
        answer: "a",
        explanation: "Satu kitaran lengkap mempunyai 4 biji manik (M, B, B, K). 15 ÷ 4 = 3 kitaran lengkap berbaki 3, dan manik ke-3 dalam kitaran ialah Biru.",
      },
      {
        id: "f1-1.1.3-q13",
        kind: "mcq",
        skill: "analyse",
        prompt: "Tiga perkataan berikut berkongsi corak palindrom (ejaan sama apabila dibaca dari depan atau belakang). Perkataan manakah yang BERBEZA?",
        options: [
          { id: "a", text: "KATAK" },
          { id: "b", text: "MALAM" },
          { id: "c", text: "RADAR" },
          { id: "d", text: "KASUT" },
        ],
        answer: "d",
        explanation: "KATAK, MALAM dan RADAR dieja sama dari depan dan belakang, manakala KASUT menjadi TUSAK apabila diterbalikkan.",
      },
    ],
  },
  {
    id: "f1-1.1.4",
    code: "1.1.4",
    title: "Membuat Keputusan Berdasarkan Aspek Penting",
    titleMs: "Membuat Keputusan Berdasarkan Aspek Penting",
    game: "group-sort",
    objective:
      "Menggunakan teknik peniskalaan untuk mengasingkan aspek penting daripada perkara tidak penting semasa membuat keputusan.",
    draw: 7,
    items: [
      {
        id: "f1-1.1.4-q01",
        kind: "sort",
        skill: "analyse",
        prompt:
          "Keluarga anda ingin menempah bilik hotel di Pulau Pinang untuk 4 orang dengan bajet RM300 semalam. Asingkan setiap maklumat mengikut Aspek Penting dan Perkara Tidak Penting.",
        buckets: [
          { id: "imp", label: "Aspek Penting" },
          { id: "unimp", label: "Perkara Tidak Penting" },
        ],
        cards: [
          { id: "c1", text: "Harga bilik bagi satu malam", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Bilangan katil / had maksimum tetamu", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Jarak dan keselamatan lokasi hotel", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c4", text: "Jenis muka taip pada tanda nama penyambut tetamu", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Corak bantal kusyen sofa di lobi", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c6", text: "Kelab bola sepak kegemaran pemilik hotel", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation:
          "Teknik peniskalaan mengekalkan aspek bajet, kapasiti bilik dan lokasi sambil meninggalkan perkara remeh yang tidak mempengaruhi keputusan.",
      },
      {
        id: "f1-1.1.4-q02",
        kind: "sort",
        skill: "analyse",
        prompt:
          "Hafiz hendak membeli sebuah komputer riba untuk pembelajaran ASK dan kelas dalam talian. Kategorikan faktor berikut.",
        buckets: [
          { id: "imp", label: "Aspek Penting" },
          { id: "unimp", label: "Perkara Tidak Penting" },
        ],
        cards: [
          { id: "c1", text: "Kapasiti RAM, storan dan kelajuan pemproses", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Harga mengikut bajet keluarga serta tempoh jaminan (waranti)", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Kamera web berfungsi dan ketahanan bateri", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c4", text: "Gambar kartun pada kotak pembungkusan", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Warna beg plastik kedai komputer", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Spesifikasi teknikal, harga, jaminan dan bateri menentukan kesesuaian pembelajaran; gambar kotak dan warna beg plastik tidak penting.",
      },
      {
        id: "f1-1.1.4-q03",
        kind: "sort",
        skill: "apply",
        prompt:
          "Peta laluan transit LRT/MRT merupakan contoh klasik teknik peniskalaan. Asingkan maklumat yang DIKEKALKAN berbanding DITINGGALKAN pada peta tersebut.",
        buckets: [
          { id: "keep", label: "Dikekalkan pada Peta Transit" },
          { id: "drop", label: "Ditinggalkan (Tidak Penting)" },
        ],
        cards: [
          { id: "c1", text: "Nama stesen dan turutan hentian", bucket: "keep", misconception: "ct-drops-essential" },
          { id: "c2", text: "Stesen pertukaran antara laluan", bucket: "keep", misconception: "ct-drops-essential" },
          { id: "c3", text: "Setiap pokok dan deretan kedai di tepi landasan", bucket: "drop", misconception: "ct-keeps-irrelevant" },
          { id: "c4", text: "Setiap selekoh kecil jalan raya di permukaan bumi", bucket: "drop", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Warna dan nombor laluan bagi membezakan arah tren", bucket: "keep", misconception: "ct-drops-essential" },
        ],
        explanation:
          "Peta transit meninggalkan butiran geografi yang berserabut supaya penumpang dapat melihat urutan stesen dan stesen pertukaran dengan jelas.",
      },
      {
        id: "f1-1.1.4-q04",
        kind: "sort",
        skill: "apply",
        prompt:
          "Anda sedang membina atur cara mengira Indeks Jisim Badan: BMI = jisim (kg) ÷ tinggi (m)². Kategorikan butiran data murid berikut.",
        buckets: [
          { id: "need", label: "Diperlukan oleh Atur Cara BMI" },
          { id: "ignore", label: "Ditinggalkan (Tidak Diperlukan)" },
        ],
        cards: [
          { id: "c1", text: "Jisim badan dalam unit kilogram (kg)", bucket: "need", misconception: "ct-drops-essential" },
          { id: "c2", text: "Tinggi murid dalam unit meter (m)", bucket: "need", misconception: "ct-drops-essential" },
          { id: "c3", text: "Minuman kegemaran di kantin", bucket: "ignore", misconception: "ct-keeps-irrelevant" },
          { id: "c4", text: "Jenama bekas pensel murid", bucket: "ignore", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Nombor rumah kediaman", bucket: "ignore", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Hanya jisim badan dan tinggi diperlukan dalam rumus BMI; data peribadi lain tidak mempengaruhi nilai pengiraan.",
      },
      {
        id: "f1-1.1.4-q05",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Cikgu Tan perlu memilih SATU dewan untuk kem pengaturcaraan Tingkatan 1 (45 orang murid, perlukan Wi-Fi dan soket kuasa, bajet RM900). Dewan manakah keputusan terbaik?",
        code: "Dewan P: RM850, muat 50 orang, Wi-Fi laju & soket lengkap, langsir warna krim biasa\nDewan Q: RM1,200, muat 60 orang, Wi-Fi laju, lampu candelier mewah\nDewan R: RM700, muat 25 orang, Wi-Fi laju, lukisan dinding berwarna-warni\nDewan S: RM800, muat 50 orang, TIADA Wi-Fi, percuma belon hiasan",
        options: [
          { id: "a", text: "Dewan P — menepati kapasiti, Wi-Fi, soket kuasa dan bajet (warna langsir tidak penting)" },
          { id: "b", text: "Dewan Q — mempunyai lampu candelier mewah", misconception: "ct-keeps-irrelevant" },
          { id: "c", text: "Dewan R — paling murah iaitu RM700", misconception: "ct-drops-essential" },
          { id: "d", text: "Dewan S — mendapat belon hiasan percuma", misconception: "ct-keeps-irrelevant" },
        ],
        answer: "a",
        explanation:
          "Dewan Q melebihi bajet, Dewan R tidak muat 45 orang murid, dan Dewan S tiada Wi-Fi. Hanya Dewan P memenuhi kesemua aspek penting.",
      },
      {
        id: "f1-1.1.4-q06",
        kind: "sort",
        skill: "analyse",
        prompt:
          "Bagi menentukan laluan paling pantas untuk ambulans tiba di Hospital Kuala Lumpur, asingkan faktor berikut.",
        buckets: [
          { id: "imp", label: "Aspek Penting" },
          { id: "unimp", label: "Perkara Tidak Penting" },
        ],
        cards: [
          { id: "c1", text: "Kesesakan jalan raya semasa dan penutupan jalan", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Jarak laluan dan anggaran masa perjalanan", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Gambar iklan pada papan tanda di tepi lebuh raya", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c4", text: "Tahun tiang lampu jalan dicat semula", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Masa perjalanan, jarak dan kesesakan trafik menentukan kepantasan ambulans; papan iklan dan cat tiang lampu adalah tidak penting.",
      },
      {
        id: "f1-1.1.4-q07",
        kind: "mcq",
        skill: "understand",
        prompt: "Apakah kesannya jika seseorang murid menggugurkan TERLALU BANYAK maklumat semasa melakukan teknik peniskalaan?",
        options: [
          { id: "a", text: "Aspek penting turut tercicir sehingga keputusan atau penyelesaian gagal digunakan dalam situasi sebenar" },
          { id: "b", text: "Model penyelesaian sentiasa menjadi lebih tepat", misconception: "ct-drops-essential" },
          { id: "c", text: "Teknik tersebut bertukar menjadi teknik leraian secara automatik", misconception: "ct-decomp-vs-abs" },
          { id: "d", text: "Tiada kesan negatif kerana semakin sedikit maklumat sentiasa lebih baik", misconception: "ct-drops-essential" },
        ],
        answer: "a",
        explanation:
          "Peniskalaan yang betul hanya meninggalkan perkara tidak penting. Jika kekangan utama (seperti kapasiti atau alahan makanan) turut diabaikan, keputusan menjadi pincang.",
      },
      {
        id: "f1-1.1.4-q08",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Sama ada semasa memilih laluan bas mahupun memilih menu makanan, penentuan sama ada sesuatu maklumat ialah 'aspek penting' bergantung pada:",
        options: [
          { id: "a", text: "Matlamat khusus dan syarat permasalahan yang sedang diselesaikan" },
          { id: "b", text: "Ayat penerangan yang paling panjang semata-mata", misconception: "ct-keeps-irrelevant" },
          { id: "c", text: "Mengabaikan semua nombor dan mengekalkan warna sahaja", misconception: "ct-keeps-irrelevant" },
          { id: "d", text: "Menyimpan setiap maklumat yang disebut tanpa sebarang tapisan", misconception: "ct-keeps-irrelevant" },
        ],
        answer: "a",
        explanation:
          "Kepentingan sesuatu aspek bergantung pada konteks masalah: warna batu bata tidak penting semasa mengira jumlah bata, tetapi menjadi penting jika menyusun corak mozek.",
      },
      {
        id: "f1-1.1.4-q09",
        kind: "sort",
        skill: "apply",
        prompt:
          "Menempah katering makanan untuk Majlis Anugerah Cemerlang Sekolah. Kategorikan setiap perkara berikut.",
        buckets: [
          { id: "imp", label: "Aspek Penting" },
          { id: "unimp", label: "Perkara Tidak Penting" },
        ],
        cards: [
          { id: "c1", text: "Status halal dan maklumat alahan makanan tetamu", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Bilangan tetamu serta kos hidangan setiap seorang", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Masa penghantaran makanan tiba sebelum waktu rehat majlis", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c4", text: "Nombor pendaftaran van syarikat katering", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Lagu kegemaran tukang masak", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Keperluan pemakanan, jumlah tetamu, kos dan ketepatan masa ialah aspek penting; nombor plat van serta lagu kegemaran tukang masak tidak berkaitan.",
      },
      {
        id: "f1-1.1.4-q10",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Mei hendak mengira tempoh masa mengisi penuh tangki air berkapasiti 600 liter menggunakan paip yang mengalir pada kadar 15 liter seminit. Maklumat manakah merupakan PERKARA TIDAK PENTING?",
        options: [
          { id: "a", text: "Tangki air tersebut diperbuat daripada plastik berwarna biru gelap" },
          { id: "b", text: "Kapasiti penuh tangki ialah 600 liter", misconception: "ct-drops-essential" },
          { id: "c", text: "Kadar aliran air paip ialah 15 liter seminit", misconception: "ct-drops-essential" },
          { id: "d", text: "Sama ada tangki bermula dalam keadaan kosong atau separuh penuh", misconception: "ct-drops-essential" },
        ],
        answer: "a",
        explanation: "Kapasiti tangki, kadar aliran air dan paras awal air mempengaruhi tempoh masa pengisian, manakala warna tangki tidak memberi sebarang kesan.",
      },
    ],
  },
  {
    id: "f1-1.1.5",
    code: "1.1.5",
    title: "Ciri-ciri Kesamaan dalam Sesuatu Permasalahan",
    titleMs: "Ciri-ciri Kesamaan dalam Sesuatu Permasalahan",
    game: "recall-blast",
    objective:
      "Menentukan ciri-ciri kesamaan struktur antara beberapa permasalahan dan membina model atau formula umum (pengitlakan).",
    draw: 10,
    items: [
      {
        id: "f1-1.1.5-q01",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Masalah 1: Menyusun tin minuman — baris ke-1 ada 2 tin, baris ke-2 ada 4 tin, baris ke-3 ada 6 tin.\nMasalah 2: Menyusun kerusi dewan — baris ke-1 ada 2 kerusi, baris ke-2 ada 4 kerusi, baris ke-3 ada 6 kerusi.\nMengapakah FORMULA YANG SAMA boleh menyelesaikan kedua-dua masalah ini?",
        options: [
          { id: "a", text: "Kedua-duanya mempunyai ciri-ciri kesamaan struktur matematik: baris ke-k mempunyai 2k objek" },
          { id: "b", text: "Tin minuman dan kerusi mempunyai berat yang sama", misconception: "ct-surface-similarity" },
          { id: "c", text: "Hanya tin boleh menggunakan formula manakala kerusi mesti dikira satu demi satu" },
          { id: "d", text: "Kedua-dua situasi berlaku di pasar raya", misconception: "ct-surface-similarity" },
        ],
        answer: "a",
        explanation:
          "Apabila dua masalah berbeza mempunyai ciri-ciri kesamaan dari segi struktur pola, satu model umum (pengitlakan) dapat menyelesaikan kedua-duanya.",
      },
      {
        id: "f1-1.1.5-q02",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "Meja segi empat sama disusun memanjang dalam satu baris: 1 meja menempatkan 4 orang, 2 meja rapat menempatkan 6 orang, 3 meja rapat menempatkan 8 orang (formula: Kerusi = 2n + 2). Berapakah orang yang dapat duduk pada 10 buah meja yang dirapatkan?",
        accept: ["22"],
        traps: [
          { answer: "40", misconception: "ct-formula-offset" },
          { answer: "20", misconception: "ct-formula-offset" },
        ],
        explanation: "Menggunakan model umum Kerusi = 2n + 2: apabila n = 10, Kerusi = 2(10) + 2 = 22 orang (bahagian tepi di tengah bercantum).",
      },
      {
        id: "f1-1.1.5-q03",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Tiang pagar dipasang sepanjang laluan lurus: 1 bahagian pagar memerlukan 2 batang tiang, 2 bahagian memerlukan 3 batang tiang, 3 bahagian memerlukan 4 batang tiang. Formula manakah mewakili bilangan tiang bagi n bahagian pagar?",
        options: [
          { id: "a", text: "Tiang = n + 1" },
          { id: "b", text: "Tiang = 2n", misconception: "ct-formula-offset" },
          { id: "c", text: "Tiang = n", misconception: "ct-formula-offset" },
          { id: "d", text: "Tiang = n − 1" },
        ],
        answer: "a",
        explanation: "Uji n = 1 → 2, n = 2 → 3, n = 3 → 4: formula Tiang = n + 1 menepati setiap kes.",
      },
      {
        id: "f1-1.1.5-q04",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Anda telah membina kaedah untuk mencari markah paling tinggi dalam senarai kelas. Masalah baharu manakah mempunyai CIRI KESAMAAN STRUKTUR paling tinggi supaya kaedah yang sama boleh diguna semula?",
        options: [
          { id: "a", text: "Mencari bacaan suhu harian paling panas yang direkodkan di Ipoh pada bulan ini" },
          { id: "b", text: "Menyusun kertas peperiksaan mengikut abjad nama murid" },
          { id: "c", text: "Mencetak poster jadual waktu kelas", misconception: "ct-surface-similarity" },
          { id: "d", text: "Menghias papan kenyataan bilik darjah", misconception: "ct-surface-similarity" },
        ],
        answer: "a",
        explanation:
          "Mencari markah tertinggi dan mencari suhu tertinggi mempunyai ciri kesamaan logik yang sama: meneliti senarai nilai dan menyimpan nilai maksimum.",
      },
      {
        id: "f1-1.1.5-q05",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "Dalam model binaan tangga batu bata, baris ke-1 menggunakan 3 ketul bata, baris ke-2 menggunakan 6 ketul bata, dan baris ke-3 menggunakan 9 ketul bata (baris ke-k mempunyai 3k bata). Berapakah ketul bata pada baris ke-7 SAHAJA?",
        accept: ["21"],
        traps: [{ answer: "10", misconception: "ct-linear-vs-diff" }],
        explanation: "Baris ke-k mempunyai 3k ketul bata, maka baris ke-7 sahaja menggunakan 3 × 7 = 21 ketul bata.",
      },
      {
        id: "f1-1.1.5-q06",
        kind: "mcq",
        skill: "understand",
        prompt: "Dalam pemikiran komputasional, apakah hasil akhir daripada teknik pengitlakan?",
        options: [
          { id: "a", text: "Satu model, peraturan atau formula umum yang boleh menyelesaikan pelbagai masalah yang mempunyai corak serupa" },
          { id: "b", text: "Senarai perkara tidak penting yang perlu dipadamkan", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Pembahagian satu tugasan kepada empat orang ahli kumpulan", misconception: "ct-decomp-vs-abs" },
          { id: "d", text: "Menghafal satu jawapan tunggal yang hanya sesuai untuk satu nombor sahaja", misconception: "ct-formula-offset" },
        ],
        answer: "a",
        explanation: "Pengitlakan menghasilkan model penyelesaian masalah (peraturan, langkah atau formula) yang boleh diaplikasikan kepada masalah lain yang sepola.",
      },
      {
        id: "f1-1.1.5-q07",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Danial mendakwa formula `Jubin = 4n` sepadan dengan corak berikut: n = 1 → 4 jubin, n = 2 → 7 jubin, n = 3 → 10 jubin. Mengapakah formula Danial salah?",
        options: [
          { id: "a", text: "Dia hanya menyemak kes n = 1; bagi n = 2 formulanya memberi 8 dan bukannya 7 (formula sebenar ialah 3n + 1)" },
          { id: "b", text: "Formula tidak boleh mengandungi operasi darab" },
          { id: "c", text: "Formulanya salah sejak n = 1 lagi" },
          { id: "d", text: "Susunan jubin tidak boleh diwakilkan dengan nombor" },
        ],
        answer: "a",
        explanation: "Setiap formula pengitlakan mesti diuji sekurang-kurangnya pada 2 hingga 3 kes! Oleh sebab pertambahan tetap ialah +3 bermula daripada 4, model yang betul ialah 3n + 1.",
      },
      {
        id: "f1-1.1.5-q08",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "Menggunakan model yang telah disahkan `Jubin = 3n + 1` (n = 1 → 4, n = 2 → 7, n = 3 → 10), berapakah bilangan jubin bagi Rajah ke-8 (n = 8)?",
        accept: ["25"],
        traps: [
          { answer: "24", misconception: "ct-formula-offset" },
          { answer: "32", misconception: "ct-formula-offset" },
        ],
        explanation: "Gantikan n = 8 ke dalam 3n + 1: 3(8) + 1 = 24 + 1 = 25 keping jubin.",
      },
      {
        id: "f1-1.1.5-q09",
        kind: "multi",
        skill: "analyse",
        prompt:
          "Pilih DUA permasalahan yang mempunyai ciri kesamaan struktur `Jumlah Bayaran = Caj Asas Tetap + (Kadar × Bilangan Unit)`.",
        options: [
          { id: "a", text: "Tambang teksi: RM3 caj permulaan + RM2 bagi setiap kilometer perjalanan" },
          { id: "b", text: "Perkhidmatan cetakan: RM5 caj penyediaan + RM0.50 bagi setiap halaman buku" },
          { id: "c", text: "Luas padang segi empat sama = panjang sisi × panjang sisi", misconception: "ct-surface-similarity" },
          { id: "d", text: "Membahagikan 24 biji gula-gula sama rata kepada 6 orang murid", misconception: "ct-surface-similarity" },
        ],
        answer: ["a", "b"],
        explanation: "Kedua-dua situasi tambang teksi dan cetakan menggabungkan satu caj asas tetap dengan caj mengikut bilangan unit.",
      },
      {
        id: "f1-1.1.5-q10",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Seorang penghantar makanan mengenakan RM4 caj asas + RM1.50 setiap km. Seorang tukang paip pula mengenakan RM30 caj pemeriksaan + RM20 setiap jam kerja. Berapakah jumlah upah tukang paip bagi kerja selama 3 jam?",
        options: [
          { id: "a", text: "RM90" },
          { id: "b", text: "RM60", misconception: "ct-drops-essential" },
          { id: "c", text: "RM150", misconception: "ct-formula-offset" },
          { id: "d", text: "RM50" },
        ],
        answer: "a",
        explanation: "Mengikut model umum Caj Asas + (Kadar × Unit): RM30 + (RM20 × 3) = RM30 + RM60 = RM90.",
      },
      {
        id: "f1-1.1.5-q11",
        kind: "mcq",
        skill: "recall",
        prompt: "Apakah istilah rasmi dalam KSSM ASK bagi proses membina peraturan, model atau formula umum berdasarkan corak persamaan?",
        options: [
          { id: "a", text: "Pengitlakan" },
          { id: "b", text: "Peniskalaan", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Leraian", misconception: "ct-decomp-vs-abs" },
          { id: "d", text: "Pengecaman corak", misconception: "ct-pattern-vs-gen" },
        ],
        answer: "a",
        explanation: "Pengitlakan ialah pembinaan peraturan atau model penyelesaian bagi masalah yang mempunyai persamaan corak.",
      },
      {
        id: "f1-1.1.5-q12",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "Memotong sebatang buluh panjang: 1 potongan menghasilkan 2 keratan, 2 potongan menghasilkan 3 keratan, 3 potongan menghasilkan 4 keratan. Berapakah potongan diperlukan untuk mendapatkan 12 keratan (dipotong satu demi satu)?",
        accept: ["11"],
        traps: [
          { answer: "12", misconception: "ct-formula-offset" },
          { answer: "13", misconception: "ct-formula-offset" },
        ],
        explanation: "Keratan = Potongan + 1, maka Potongan = Keratan − 1 = 12 − 1 = 11 potongan.",
      },
    ],
  },
  {
    id: "f1-1.1",
    code: "1.1",
    title: "Cabaran Penguasaan Bab 1: Asas Pemikiran Komputasional",
    titleMs: "Asas Pemikiran Komputasional",
    boss: true,
    game: "escape-room",
    objective:
      "Menggabungkan teknik leraian, pengecaman corak, peniskalaan dan pengitlakan bagi menyelesaikan masalah pelbagai langkah.",
    draw: 8,
    items: [
      {
        id: "f1-1.1-q01",
        kind: "match",
        skill: "understand",
        prompt: "Kunci 1 — Padankan setiap tindakan penganjuran Hari Sukan Sekolah dengan teknik pemikiran komputasional.",
        pairs: [
          { id: "p1", left: "Membahagikan pengurusan kepada acara balapan, acara padang, pertolongan cemas dan perbarisan", right: "Teknik Leraian" },
          { id: "p2", left: "Menyedari setiap saringan 100 meter mengambil masa sekitar 4 minit pada setiap tahun", right: "Teknik Pengecaman Corak" },
          { id: "p3", left: "Menyusun jadual berdasarkan bilangan pelari dan lorong sambil mengabaikan jenama kasut", right: "Teknik Peniskalaan" },
          { id: "p4", left: "Membina formula: Bilangan Saringan = bundar_atas(Bilangan Pelari ÷ 8 lorong)", right: "Teknik Pengitlakan" },
        ],
        explanation: "Penganjuran Hari Sukan menggabungkan keempat-empat teknik daripada leraian tugas hinggalah formula jadual saringan.",
      },
      {
        id: "f1-1.1-q02",
        kind: "order",
        skill: "apply",
        prompt: "Kunci 2 — Susun langkah mengira baki wang bayaran murid di koperasi sekolah secara tertib.",
        steps: [
          { id: "s1", text: "Senaraikan harga seunit dan kuantiti setiap barang yang dibeli" },
          { id: "s2", text: "Darabkan harga × kuantiti bagi setiap barang dan jumlahkan kesemuanya" },
          { id: "s3", text: "Pastikan wang tunai yang diserahkan mencukupi atau melebihi jumlah harga" },
          { id: "s4", text: "Tolak jumlah harga keseluruhan daripada wang tunai yang diterima untuk mendapatkan baki" },
        ],
        misconception: "ct-step-order",
        explanation: "Jumlah kecil setiap barang dikira dahulu, diikuti jumlah keseluruhan, semakan kecukupan wang, dan operasi tolak baki.",
      },
      {
        id: "f1-1.1-q03",
        kind: "sort",
        skill: "analyse",
        prompt:
          "Kunci 3 — Anda perlu menentukan bilangan bas sewa khas untuk membawa 170 orang murid Tingkatan 1 ke Petrosains. Kategorikan maklumat berikut.",
        buckets: [
          { id: "imp", label: "Aspek Penting (Kekalkan)" },
          { id: "unimp", label: "Perkara Tidak Penting (Abaikan)" },
        ],
        cards: [
          { id: "c1", text: "Jumlah keseluruhan murid dan guru pengiring", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Bilangan tempat duduk sebuah bas (44 tempat duduk)", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Kadar sewa sebuah bas berbanding peruntukan kewangan lawatan", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c4", text: "Kedai makan kegemaran pemandu bas", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Corak bunga pada langsir tingkap bas", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Jumlah penumpang, kapasiti tempat duduk dan kos sewa menentukan bilangan bas; langsir dan kegemaran pemandu tidak berkaitan.",
      },
      {
        id: "f1-1.1-q04",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "Kunci 4 — Seramai 170 orang murid + 10 orang guru pengiring = 180 penumpang. Setiap bas memuatkan 44 penumpang. Berapakah bilangan MINIMUM bas penuh yang diperlukan supaya tiada sesiapa tertinggal?",
        accept: ["5"],
        traps: [{ answer: "4", misconception: "ct-drops-essential" }],
        explanation: "180 ÷ 44 = 4 berbaki 4 orang. Empat buah bas hanya memuatkan 176 orang, maka perlu dibundarkan ke atas kepada 5 buah bas.",
      },
      {
        id: "f1-1.1-q05",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Kunci 5 — Rantaian sarang lebah berbentuk heksagon sebaris: 1 heksagon mempunyai 6 dinding, 2 heksagon bercantum berkongsi 1 dinding (jumlah 11 dinding), 3 heksagon sebaris mempunyai 16 dinding. Formula manakah mewakili n heksagon sebaris?",
        options: [
          { id: "a", text: "5n + 1" },
          { id: "b", text: "6n", misconception: "ct-formula-offset" },
          { id: "c", text: "6n − 1", misconception: "ct-formula-offset" },
          { id: "d", text: "n + 5", misconception: "ct-linear-vs-diff" },
        ],
        answer: "a",
        explanation: "Bermula dengan 6 dinding bagi n = 1, setiap heksagon tambahan berkongsi 1 dinding (+5 dinding): 5(1)+1=6, 5(2)+1=11, 5(3)+1=16.",
      },
      {
        id: "f1-1.1-q06",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt: "Kunci 6 — Berdasarkan formula sarang lebah `Dinding = 5n + 1`, berapakah jumlah dinding bagi 9 heksagon yang bercantum sebaris?",
        accept: ["46"],
        traps: [{ answer: "54", misconception: "ct-formula-offset" }],
        explanation: "5 × 9 + 1 = 45 + 1 = 46 dinding.",
      },
      {
        id: "f1-1.1-q07",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Kunci 7 — Aisha mendapati bateri telefonnya menyusut 12% setiap jam semasa panggilan video: 100%, 88%, 76%, 64%… Apakah DUA teknik yang digunakannya apabila dia menulis rumus `Bateri = 100 − 12j`?",
        options: [
          { id: "a", text: "Pengecaman corak (mengesan penyusutan −12% sejam) diikuti Pengitlakan (menulis formula 100 − 12j)" },
          { id: "b", text: "Teknik leraian sahaja", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Teknik peniskalaan sahaja", misconception: "ct-decomp-vs-abs" },
          { id: "d", text: "Tiada sebarang teknik pemikiran komputasional terlibat" },
        ],
        answer: "a",
        explanation: "Mengesan pola penurunan tetap −12% ialah pengecaman corak; menterjemahkannya kepada formula umum `100 − 12j` ialah pengitlakan.",
      },
      {
        id: "f1-1.1-q08",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Kunci 8 — Masalah manakah mempunyai ciri kesamaan struktur yang SAMA dengan mengira bilangan bas 44 tempat duduk bagi 180 penumpang?",
        options: [
          { id: "a", text: "Mengira bilangan papan telur (12 biji sepapan) yang diperlukan untuk mengisi 100 biji telur tanpa baki tertinggal" },
          { id: "b", text: "Mengecat badan bas sekolah dengan warna kuning", misconception: "ct-surface-similarity" },
          { id: "c", text: "Menyenaraikan nama 44 buah perhentian bas", misconception: "ct-surface-similarity" },
          { id: "d", text: "Mengira purata tinggi bagi 5 orang pemain bola jaring" },
        ],
        answer: "a",
        explanation: "Kedua-dua masalah membahagikan jumlah item dengan kapasiti bekas dan membundarkan sebarang baki ke atas kepada bilangan bekas penuh.",
      },
      {
        id: "f1-1.1-q09",
        kind: "mcq",
        skill: "apply",
        prompt: "Kunci 9 — Semak jujukan nombor berikut: 3, 7, 15, 31, ? Apakah sebutan seterusnya?",
        options: [
          { id: "a", text: "63 (setiap sebutan didarab 2 kemudian ditambah 1: 31 × 2 + 1)" },
          { id: "b", text: "47 (menambah 16 sekali lagi)", misconception: "ct-linear-vs-diff" },
          { id: "c", text: "62 (terlupa tambah 1)", misconception: "ct-formula-offset" },
          { id: "d", text: "39" },
        ],
        answer: "a",
        explanation: "Beza antara sebutan berganda dua (+4, +8, +16, +32), atau secara setara 2 × 31 + 1 = 63.",
      },
      {
        id: "f1-1.1-q10",
        kind: "multi",
        skill: "understand",
        prompt: "Kunci 10 — Pilih SEMUA pernyataan yang tepat tentang penyelesaian masalah berasaskan pemikiran komputasional.",
        options: [
          { id: "a", text: "Masalah kompleks dipecahkan kepada bahagian-bahagian kecil yang mudah diurus (leraian)" },
          { id: "b", text: "Langkah disusun secara tertib supaya input tersedia sebelum pengiraan dilakukan" },
          { id: "c", text: "Hanya aspek penting dikekalkan dalam model penyelesaian (peniskalaan)" },
          { id: "d", text: "Perkara hiasan seperti warna kertas mesti dimasukkan ke dalam formula pengiraan", misconception: "ct-keeps-irrelevant" },
        ],
        answer: ["a", "b", "c"],
        explanation: "Leraian masalah, susunan langkah secara tertib dan peniskalaan aspek penting ialah teras utama pemikiran komputasional.",
      },
      {
        id: "f1-1.1-q11",
        kind: "order",
        skill: "analyse",
        prompt: "Kunci 11 — Susun langkah penyediaan pelan laluan kecemasan kebakaran sekolah mengikut urutan pemikiran komputasional.",
        steps: [
          { id: "s1", text: "Bahagikan kawasan sekolah mengikut Blok A, Blok B, makmal dan padang berkumpul" },
          { id: "s2", text: "Kenal pasti corak laluan tangga kecemasan paling dekat pada setiap aras" },
          { id: "s3", text: "Lukis pelan lantai ringkas bersama anak panah laluan tanpa melukis poster hiasan kelas" },
          { id: "s4", text: "Tetapkan peraturan pengosongan bangunan yang seragam bagi setiap kelas di aras tersebut" },
        ],
        misconception: "ct-step-order",
        explanation: "Pembahagian blok (leraian) → pola laluan tangga (pengecaman corak) → pelan ringkas (peniskalaan) → peraturan seragam (pengitlakan).",
      },
    ],
  },
];
