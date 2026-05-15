import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('시스템 제목을 렌더링한다', () => {
    render(<App />);
    expect(screen.getByText('영업 일일보고 시스템')).toBeInTheDocument();
  });
});
