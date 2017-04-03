import * as React from 'react';

//
// <InputEl /> - A generic text input field.
//
interface InputProps {
  enterText?: string;
  placeholder?: string;
  size?: number;
  onSubmit: (text: string) => void;
}

export class InputEl extends React.Component<InputProps, {value: string}> {
  constructor(props: InputProps) {
    super(props);
    this.state = {
      value: ''
    };
  }

  render() {
    let self = this;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      self.setState({value: e.target.value});
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      self.setState((prevState: {value: string}) => {
        self.props.onSubmit(prevState.value);
        return {
          value: ''
        };
      });
    }

    return (
      <form onSubmit={handleSubmit}>
        <input type="text"
               size={this.props.size || 32}
               placeholder={this.props.placeholder || ''}
               onChange={handleChange}
               value={this.state.value} />
        &nbsp;
        <input type="submit" value={this.props.enterText || 'OK'} />
      </form>
    );
  }
}
