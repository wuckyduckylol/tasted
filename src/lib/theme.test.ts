import { scoreColor, colors } from './theme';

describe('scoreColor', () => {
  it('maps scores to verdict colors by band range', () => {
    expect(scoreColor(10)).toBe(colors.loved);
    expect(scoreColor(7)).toBe(colors.loved);
    expect(scoreColor(6.9)).toBe(colors.fine);
    expect(scoreColor(4)).toBe(colors.fine);
    expect(scoreColor(3.9)).toBe(colors.disliked);
    expect(scoreColor(0)).toBe(colors.disliked);
  });
});
