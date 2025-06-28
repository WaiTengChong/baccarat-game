import { Flex, Splitter, Typography } from 'antd';
import React from 'react';
import './App.css';
import Playground from './playground/playground';
import { LogProvider } from './Terminal/LongContext';
import TerminalSidebar from './Terminal/terminal';

const Desc = props => (
  <Flex className={props.className ? `desc ${props.className}` : 'desc'}>
    <Typography.Title type="secondary" level={5} style={{ whiteSpace: 'nowrap' }}>
      {props.text}
    </Typography.Title>
  </Flex>
);

const App = () => (
        <LogProvider>
  <Splitter style={{ height: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
    <Splitter.Panel defaultSize="15%" min="10%" max="25%">
      <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
        <TerminalSidebar />
      </div>
    </Splitter.Panel>
    <Splitter.Panel defaultSize="70%" min="50%">
      <Playground />
    </Splitter.Panel>
  </Splitter>

    </LogProvider>
);
export default App;