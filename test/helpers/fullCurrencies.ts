export default `
<?xml version="1.0" encoding="utf-8"?>
<CurrenciesList xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xmlns="http://merchant.roboxchange.com/WebService/">
    <Result>
        <Code>0</Code>
    </Result>
    <Groups>
        <Group Code="EMoney" Description="Электронным кошельком">
            <Items>
                <Currency Label="Qiwi50RIBRM" Alias="QiwiWallet" Name="QIWI Кошелек"/>
                <Currency Label="YandexMerchantRIBR" Alias="YandexMoney" Name="Яндекс.Деньги"/>
                <Currency Label="WMR30RM" Alias="WMR" Name="WMR"/>
                <Currency Label="W1RIBR" Alias="W1" Name="RUR Единый кошелек" MaxValue="14999"/>
                <Currency Label="ElecsnetWalletRIBR" Alias="ElecsnetWallet" Name="Кошелек Элекснет" MaxValue="14999"/>
            </Items>
        </Group>
        <Group Code="Bank" Description="Через интернет-банк">
            <Items>
                <Currency Label="AlfaBankRIBR" Alias="AlfaBank" Name="Альфа-Клик"/>
                <Currency Label="VTB24RIBR" Alias="VTB24" Name="ВТБ" MinValue="1000"/>
                <Currency Label="W1RIBPSBR" Alias="W1" Name="RUR Единый кошелек" MinValue="1" MaxValue="14999"/>
                <Currency Label="MINBankRIBR" Alias="BankMIN" Name="Московский Индустриальный Банк"/>
                <Currency Label="BSSIntezaRIBR" Alias="BankInteza" Name="Банк Интеза" MaxValue="15000"/>
                <Currency Label="BSSAvtovazbankR" Alias="BankAVB" Name="Банк АВБ"/>
                <Currency Label="FacturaBinBank" Alias="BankBin" Name="БИНБАНК"/>
                <Currency Label="BSSFederalBankForInnovationAndDevelopmentR" Alias="BankFBID"
                          Name="ФБ Инноваций и Развития"/>
                <Currency Label="FacturaSovCom" Alias="BankSovCom" Name="Совкомбанк"/>
                <Currency Label="BSSNationalBankTRUSTR" Alias="BankTrust" Name="Национальный банк ТРАСТ"/>
            </Items>
        </Group>
        <Group Code="BankCard" Description="Банковской картой">
            <Items>
                <Currency Label="BANKOCEAN3R" Alias="BankCard" Name="Банковская карта"/>
                <Currency Label="CardHalvaRIBR" Alias="BankCardHalva" Name="Карта Халва"/>
                <Currency Label="ApplePayRIBR" Alias="ApplePay" Name="Apple Pay"/>
                <Currency Label="SamsungPayRIBR" Alias="SamsungPay" Name="Samsung Pay"/>
            </Items>
        </Group>
        <Group Code="Terminals" Description="В терминале">
            <Items>
                <Currency Label="Qiwi50RIBRM" Alias="QiwiWallet" Name="QIWI Кошелек"/>
                <Currency Label="TerminalsElecsnetRIBR" Alias="TerminalsElecsnet" Name="Терминал Элекснет"
                          MaxValue="15000"/>
            </Items>
        </Group>
        <Group Code="Mobile" Description="Сотовые операторы">
            <Items>
                <Currency Label="MixplatMTSRIBR" Alias="PhoneMTS" Name="МТС" MinValue="10" MaxValue="15000"/>
                <Currency Label="MixplatBeelineRIBR" Alias="PhoneBeeline" Name="Билайн" MinValue="10" MaxValue="15000"/>
                <Currency Label="MixplatTele2RIBR" Alias="PhoneTele2" Name="Tele2" MinValue="10" MaxValue="15000"/>
                <Currency Label="MixplatMegafonRIBR" Alias="PhoneMegafon" Name="Мегафон" MinValue="10"
                          MaxValue="15000"/>
                <Currency Label="CypixTatTelecomRIB" Alias="PhoneTatTelecom" Name="Таттелеком" MinValue="10"
                          MaxValue="15000"/>
            </Items>
        </Group>
        <Group Code="Other" Description="Другие способы">
            <Items>
                <Currency Label="RapidaRIBEurosetR" Alias="StoreEuroset" Name="Евросеть" MaxValue="15000"/>
                <Currency Label="RapidaRIBSvyaznoyR" Alias="StoreSvyaznoy" Name="Связной" MaxValue="15000"/>
                <Currency Label="Biocoin" Alias="BioCoin" Name="BioCoin" MaxValue="15000"/>
            </Items>
        </Group>
    </Groups>
</CurrenciesList>
`;