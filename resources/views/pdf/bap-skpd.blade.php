<!DOCTYPE html>
<html lang="id">

<head>
  <meta charset="utf-8">
  <title>Berita Acara Pemakaian Bukti SKPD — {{ $documentNumber }}</title>
  <style>
    @page {
      size: 210mm 330mm;
      margin: 8mm 16mm 10mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #000;
      font-family: "DejaVu Sans", sans-serif;
      font-size: 9pt;
      line-height: 1;
    }

    .letterhead {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2px;
      margin-left: 20px;
      text-align: center;
      vertical-align: middle;
    }

    .letterhead td {
      vertical-align: middle;
    }

    .logo-cell {
      width: 64px;
      text-align: right;
      vertical-align: top;
    }

    .logo {
      width: 76px;
      height: auto;
      margin-left: 20px;
    }

    .institution {
      text-align: center;
    }

    .institution div {
      line-height: 0.90;
    }

    .institution .government {
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: .3px;
    }

    .institution .agency {
      font-size: 11pt;
      font-weight: 700;
    }

    .institution .unit {
      font-size: 11pt;
      font-weight: 700;
    }

    .institution .address {
      margin-top: 1px;
      font-size: 9.5pt;
    }

    .institution .city {
      margin-top: 2px;
      margin-left: 50px;
      font-size: 11pt;
      letter-spacing: 2px;
      font-weight: 600;
    }

    .postal {
      letter-spacing: 0;
      float: right;
      font-size: 9pt;
    }

    .letterhead-line {
      border-top: 3px solid #000;
      border-bottom: 1px solid #000;
      height: 3px;
      margin-top: 10px;
      margin-bottom: 20px;
    }

    .title {
      text-align: center;
      font-weight: 700;
      text-decoration: underline;
      font-size: 12pt;
      margin: 0;
    }

    .document-number {
      text-align: center;
      font-weight: 700;
      margin: 2px 0 16px;
    }

    .paragraph {
      text-align: justify;
      margin: 0 0 12px;
    }

    .identity {
      width: 100%;
      border-collapse: collapse;
      margin: 5px 0 12px;
    }

    .identity td {
      padding: 1px 2px;
      vertical-align: top;
    }

    .identity .number {
      width: 22px;
    }

    .identity .label {
      width: 92px;
    }

    .identity .separator {
      width: 12px;
      text-align: center;
    }

    .party-label {
      margin: 8px 0 14px 24px;
    }

    .usage {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 10px;
    }

    .usage td {
      padding: 2px 0;
      vertical-align: top;
      line-height: 0.9;
    }

    .usage .label {
      width: 160px;
    }

    .usage .separator {
      width: 18px;
      text-align: center;
    }

    .cancellation-title {
      margin: 9px 0 3px;
      font-weight: 700;
    }

    .cancellations {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .cancellations th,
    .cancellations td {
      border: 1px solid #000;
      padding: 5px 7px;
      vertical-align: top;
    }

    .cancellations th {
      text-align: center;
      font-weight: 700;
    }

    .cancellations .row-number {
      width: 32px;
      text-align: center;
    }

    .cancellations .numerator {
      width: 110px;
      font-family: "DejaVu Sans Mono", monospace;
    }

    .closing {
      margin-top: 14px;
    }

    .signatures {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      page-break-inside: avoid;
    }

    .signatures td {
      width: 50%;
      text-align: center;
      vertical-align: top;
      padding: 0 8px;
    }

    .sign-space {
      height: 38px;
    }

    .signature-name {
      font-weight: 700;
      text-decoration: underline;
      text-transform: uppercase;
    }

    .signature-nip {
      margin-top: 1px;
    }

    .lower-signatures {
      margin-top: 22px;
    }

    .official-position {
      min-height: 34px;
    }

    .rank {
      margin-top: 1px;
    }
  </style>
</head>

<body>
  @php
    $firstParty = $officials['first_party'];
    $secondParty = $officials['second_party'];
    $head = $officials['head'];
    $thirdParty = $officials['third_party'];
  @endphp

  <table class="letterhead">
    <tr>
      <td class="logo-cell">
        @if ($logoDataUri !== null)
          <img class="logo" src="{{ $logoDataUri }}" alt="Logo Pemerintah Provinsi NTT">
        @endif
      </td>
      <td class="institution">
        <div class="government">{{ $institution['government'] }}</div>
        <div class="agency">{{ $institution['agency'] }}</div>
        <div class="unit">{{ $institution['unit'] }}</div>
        <div class="address">{{ $institution['address'] }}</div>
        <div class="city">{{ $institution['city'] }} <span class="postal">Kode Pos {{ $institution['postal_code'] }}</span></div>
      </td>
      <td class="logo-cell"></td>
    </tr>
  </table>
  <div class="letterhead-line"></div>

  <p class="title">BERITA ACARA PEMAKAIAN BUKTI SKPD</p>
  <p class="document-number">NOMOR : {{ $documentNumber }}</p>

  <p class="paragraph">
    Pada hari ini, <strong>{{ $formalDate['day_name'] }}</strong>, Tanggal
    <strong>{{ $formalDate['date_words'] }}</strong>, Bulan
    <strong>{{ $formalDate['month_name'] }}</strong>, Tahun
    <strong>{{ $formalDate['year_words'] }}</strong>, yang bertanda tangan di bawah ini:
  </p>

  <table class="identity">
    <tr>
      <td class="number" rowspan="4">1.</td>
      <td class="label">Nama</td>
      <td class="separator">:</td>
      <td>{{ $firstParty['name'] }}</td>
    </tr>
    <tr>
      <td class="label">NIP</td>
      <td class="separator">:</td>
      <td>{{ $firstParty['nip'] }}</td>
    </tr>
    <tr>
      <td class="label">Pangkat/Gol</td>
      <td class="separator">:</td>
      <td>{{ $firstParty['rank'] }}</td>
    </tr>
    <tr>
      <td class="label">Jabatan</td>
      <td class="separator">:</td>
      <td>{{ $firstParty['position'] }}</td>
    </tr>
  </table>
  <p class="party-label">Selanjutnya disebut <strong>PIHAK PERTAMA</strong></p>

  <table class="identity">
    <tr>
      <td class="number" rowspan="4">2.</td>
      <td class="label">Nama</td>
      <td class="separator">:</td>
      <td>{{ $secondParty['name'] }}</td>
    </tr>
    <tr>
      <td class="label">NIP</td>
      <td class="separator">:</td>
      <td>{{ $secondParty['nip'] }}</td>
    </tr>
    <tr>
      <td class="label">Pangkat/Gol</td>
      <td class="separator">:</td>
      <td>{{ $secondParty['rank'] }}</td>
    </tr>
    <tr>
      <td class="label">Jabatan</td>
      <td class="separator">:</td>
      <td>{{ $secondParty['position'] }}</td>
    </tr>
  </table>
  <p class="party-label">Selanjutnya disebut <strong>PIHAK KEDUA</strong></p>

  <p class="paragraph">
    Dengan ini PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA dan PIHAK KEDUA menyatakan telah menerima dari PIHAK PERTAMA Pemakaian Bukti SKPD dan Laporan Jurnal Harian. Selanjutnya, setelah bukti tersebut diverifikasi, PIHAK KEDUA menyerahkan kepada PIHAK KETIGA untuk diarsipkan dengan rincian
    sebagai berikut:
  </p>

  <table class="usage">
    <tr>
      <td class="label">SKPD</td>
      <td class="separator">:</td>
      <td><strong>{{ number_format($totalUsage, 0, ',', '.') }} Set</strong></td>
    </tr>
    <tr>
      <td class="label">Nomerator Awal</td>
      <td class="separator">:</td>
      <td><strong>{{ $numeratorStart }}</strong></td>
    </tr>
    <tr>
      <td class="label">Nomerator Akhir</td>
      <td class="separator">:</td>
      <td><strong>{{ $numeratorEnd }}</strong></td>
    </tr>
    <tr>
      <td class="label">SKPD Batal/Rusak</td>
      <td class="separator">:</td>
      <td><strong>{{ number_format($cancellationCount, 0, ',', '.') }} Set</strong></td>
    </tr>
  </table>

  @if ($cancellationCount > 0)
    <p class="cancellation-title">Nomerator dan Keterangan</p>
    <table class="cancellations">
      <thead>
        <tr>
          <th class="row-number">No.</th>
          <th class="numerator">Nomerator</th>
          <th>Keterangan</th>
        </tr>
      </thead>
      <tbody>
        @foreach ($cancellations as $cancellation)
          <tr>
            <td class="row-number">{{ $cancellation['number'] }}</td>
            <td class="numerator">{{ $cancellation['numerator'] }}</td>
            <td>{{ $cancellation['statement'] }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  @endif

  <p class="closing">Demikian Berita Acara ini dibuat, untuk dipergunakan sebagaimana mestinya.</p>

  <table class="signatures">
    <tr>
      <td>
        <div>PIHAK KEDUA:</div>
        <div class="official-position">{{ $secondParty['position'] }},</div>
        <div class="sign-space"></div>
        <div class="signature-name">{{ $secondParty['name'] }}</div>
        <div class="signature-nip">NIP. {{ $secondParty['nip'] }}</div>
      </td>
      <td>
        <div>PIHAK PERTAMA:</div>
        <div class="official-position">{{ $firstParty['position'] }},</div>
        <div class="sign-space"></div>
        <div class="signature-name">{{ $firstParty['name'] }}</div>
        <div class="signature-nip">NIP. {{ $firstParty['nip'] }}</div>
      </td>
    </tr>
  </table>

  <table class="signatures lower-signatures">
    <tr>
      <td>
        <div>MENGETAHUI:</div>
        <div class="official-position">{{ $head['position'] }}</div>
        <div class="sign-space"></div>
        <div class="signature-name">{{ $head['name'] }}</div>
        @if ($head['rank'])
          <div class="rank">{{ $head['rank'] }}</div>
        @endif
        <div class="signature-nip">NIP. {{ $head['nip'] }}</div>
      </td>
      <td>
        <div>PIHAK KETIGA</div>
        <div class="official-position">{{ $thirdParty['position'] }}</div>
        <div class="sign-space"></div>
        <div class="signature-name">{{ $thirdParty['name'] }}</div>
        @if ($thirdParty['rank'])
          <div class="rank">{{ $thirdParty['rank'] }}</div>
        @endif
        <div class="signature-nip">NIP. {{ $thirdParty['nip'] }}</div>
      </td>
    </tr>
  </table>
</body>

</html>
