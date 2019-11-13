export default (code) => `
<?xml version="1.0" encoding="utf-8"?>
<OperationStateResponse xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                        xmlns="http://merchant.roboxchange.com/WebService/">
    <Result>
        <Code>0</Code>
    </Result>
    <State>
        <Code>${code}</Code>
        <RequestDate>2019-11-13T10:21:22.0500029+03:00</RequestDate>
        <StateDate>2018-02-22T15:56:54.6833333+03:00</StateDate>
    </State>    
</OperationStateResponse>
`;