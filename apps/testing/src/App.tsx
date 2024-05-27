import {Slider} from "@nextui-org/react";

import "./App.css";

function App() {
  return (
    <div className="flex flex-row  max-w-md h-[348px] gap-6 w-full min-w-[600px]">
      <Slider
        // hideThumb
        showTooltip
        className="max-w-md"
        defaultValue={[100, 600]}
        formatOptions={{style: "currency", currency: "USD"}}
        label="Price Range"
        maxValue={1000}
        minValue={0}
        orientation="horizontal"
        step={100}
        // onChange={() => console.log('change')}
        // onChangeEnd={() => console.log('change end')}
      />
    </div>
  );
}

export default App;
