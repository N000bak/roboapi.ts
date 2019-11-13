export default (code) => `
<?xml version="1.0" encoding="utf-8"?>
<OperationStateResponse xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://merchant.roboxchange.com/WebService/">
    <Result>
        <Code>${code}</Code>
        <Description>Описание проблемы</Description>
    </Result>
</OperationStateResponse>
`;