const getRandomNibble = () => Math.floor(Math.random() * 256)

const transformRequest = (args: string) => {
  const parsedArgs = JSON.parse(args)
  return {
    method: 'HEAD',
    headers: {
      'X-Forwarded-For': `${getRandomNibble()}.${getRandomNibble()}.${getRandomNibble()}.${getRandomNibble()}`,
    },
  }
}
